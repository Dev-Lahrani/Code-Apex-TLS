from __future__ import annotations

import json
from typing import Any, Dict

import httpx

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "tinyllama"
PROMPT_TEMPLATE = (
    "Analyze this document edit and detect if it is suspicious, malicious, or unusual. "
    "Respond strictly in JSON with keys: risk_score (0-1 float) and label (safe or suspicious). "
    "Content:\n{content}"
)


async def analyze_edit(content: str) -> Dict[str, Any]:
    payload = {
        "model": MODEL_NAME,
        "prompt": PROMPT_TEMPLATE.format(content=content),
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(OLLAMA_URL, json=payload)
    except httpx.HTTPError:
        return {"risk_score": 0.0, "label": "safe"}

    if response.status_code >= 400:
        return {"risk_score": 0.0, "label": "safe"}

    data = response.json()
    raw_output = data.get("response") or data.get("text") or ""

    risk_score = 0.0
    label = "safe"

    try:
        parsed = json.loads(raw_output)
        risk_score = float(parsed.get("risk_score", 0.0))
        label = str(parsed.get("label", "safe")).lower()
    except (ValueError, TypeError, json.JSONDecodeError):
        lowered = raw_output.lower()
        if "suspicious" in lowered or "malicious" in lowered:
            risk_score = 0.75
            label = "suspicious"

    risk_score = max(0.0, min(1.0, risk_score))
    if label not in {"safe", "suspicious"}:
        label = "safe"

    return {"risk_score": risk_score, "label": label}
