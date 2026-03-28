from __future__ import annotations

import json
from typing import Any, Dict

import httpx

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "tinyllama"
PROMPT_TEMPLATE = (
    "You are a security classifier. Analyze the following document content and decide if it is safe or suspicious.\n"
    "Suspicious content includes: SQL injection, shell commands, malware, data exfiltration attempts, threats, or clearly malicious instructions.\n"
    "Normal content includes: business text, reports, meeting notes, code reviews, or any regular writing.\n\n"
    "Respond with ONLY a single line of JSON and nothing else. No explanation. No markdown. Example:\n"
    '{"risk_score": 0.1, "label": "safe"}\n\n'
    "Content to analyze:\n{content}\n\n"
    "JSON response:"
)


async def analyze_edit(content: str) -> Dict[str, Any]:
    payload = {
        "model": MODEL_NAME,
        "prompt": PROMPT_TEMPLATE.format(content=content),
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
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
        # Try to extract JSON from anywhere in the response
        import re

        json_match = re.search(r"\{[^}]+\}", raw_output)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                risk_score = float(parsed.get("risk_score", 0.0))
                label = str(parsed.get("label", "safe")).lower()
            except (ValueError, TypeError, json.JSONDecodeError):
                pass

        # If still no valid parse, use rule-based detection on the ORIGINAL CONTENT not the LLM response
        if risk_score == 0.0 and label == "safe":
            content_lower = content.lower()
            suspicious_patterns = [
                "drop table", "delete from", "rm -rf", "exec(", "eval(",
                "__import__", "os.system", "subprocess", "base64.decode",
                "wget ", "curl ", "/etc/passwd", "chmod 777",
                "insert into", "update set", "truncate table",
            ]
            matches = sum(1 for pattern in suspicious_patterns if pattern in content_lower)
            if matches >= 2:
                risk_score = 0.85
                label = "suspicious"
            elif matches == 1:
                risk_score = 0.6
                label = "safe"  # single match not enough to flag

    risk_score = max(0.0, min(1.0, risk_score))
    if label not in {"safe", "suspicious"}:
        label = "safe"

    return {"risk_score": risk_score, "label": label}
