import base64
from typing import Iterable, List, Tuple

# Use Crypto namespace provided by pycryptodome.
from Crypto.Protocol.SecretSharing import Shamir


def _encode_share(share: bytes) -> str:
    return base64.urlsafe_b64encode(share).decode()


def _decode_share(share_b64: str) -> bytes:
    return base64.urlsafe_b64decode(share_b64)


def split_key(key_b64: str, threshold: int, num_shares: int) -> List[Tuple[int, str]]:
    key = base64.urlsafe_b64decode(key_b64)
    if len(key) not in (16, 32):
        raise ValueError("Key must be 128-bit or 256-bit")

    if len(key) == 16:
        shares = Shamir.split(threshold, num_shares, key)
        return [(idx, _encode_share(share)) for idx, share in shares]

    first_half, second_half = key[:16], key[16:]
    first_shares = {idx: share for idx, share in Shamir.split(threshold, num_shares, first_half)}
    second_shares = {idx: share for idx, share in Shamir.split(threshold, num_shares, second_half)}

    combined: List[Tuple[int, str]] = []
    for idx in sorted(first_shares.keys()):
        if idx not in second_shares:
            raise ValueError("Mismatched share indices for split halves")
        encoded = f"{_encode_share(first_shares[idx])}:{_encode_share(second_shares[idx])}"
        combined.append((idx, encoded))
    return combined


def reconstruct_key(shares: Iterable[Tuple[int, str]]) -> str:
    first_parts: List[Tuple[int, bytes]] = []
    second_parts: List[Tuple[int, bytes]] = []

    for idx, share in shares:
        if ":" in share:
            first_b64, second_b64 = share.split(":", 1)
            first_parts.append((idx, _decode_share(first_b64)))
            second_parts.append((idx, _decode_share(second_b64)))
        else:
            first_parts.append((idx, _decode_share(share)))

    if second_parts and len(second_parts) != len(first_parts):
        raise ValueError("Incomplete shares for reconstructed key halves")

    first_key = Shamir.combine(first_parts)
    if not second_parts:
        return base64.urlsafe_b64encode(first_key).decode()

    second_key = Shamir.combine(second_parts)
    return base64.urlsafe_b64encode(first_key + second_key).decode()
