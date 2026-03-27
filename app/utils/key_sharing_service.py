import base64
from typing import Iterable, List, Tuple

from Cryptodome.Protocol.SecretSharing import Shamir


def _encode_share(share: bytes) -> str:
    return base64.urlsafe_b64encode(share).decode()


def _decode_share(share_b64: str) -> bytes:
    return base64.urlsafe_b64decode(share_b64)


def split_key(key_b64: str, threshold: int, num_shares: int) -> List[Tuple[int, str]]:
    key = base64.urlsafe_b64decode(key_b64)
    shares = Shamir.split(threshold, num_shares, key)
    return [(idx, _encode_share(share)) for idx, share in shares]


def reconstruct_key(shares: Iterable[Tuple[int, str]]) -> str:
    decoded_shares = [(idx, _decode_share(share)) for idx, share in shares]
    key_bytes = Shamir.combine(decoded_shares)
    return base64.urlsafe_b64encode(key_bytes).decode()
