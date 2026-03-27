import base64

# Use the Crypto namespace provided by pycryptodome (installed via requirements.txt).
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes


def generate_key() -> str:
    """Generate a 256-bit AES key, encoded base64-url."""
    key = get_random_bytes(32)
    return base64.urlsafe_b64encode(key).decode()


def _decode_key(key_b64: str) -> bytes:
    try:
        key = base64.urlsafe_b64decode(key_b64)
    except Exception as exc:
        raise ValueError("Invalid encryption key") from exc
    if len(key) != 32:
        raise ValueError("Invalid encryption key length")
    return key


def encrypt(data: str, key_b64: str) -> str:
    key = _decode_key(key_b64)
    cipher = AES.new(key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(data.encode())
    payload = cipher.nonce + tag + ciphertext
    return base64.urlsafe_b64encode(payload).decode()


def decrypt(token_b64: str, key_b64: str) -> str:
    key = _decode_key(key_b64)
    try:
        payload = base64.urlsafe_b64decode(token_b64)
    except Exception as exc:
        raise ValueError("Invalid encrypted payload") from exc

    if len(payload) < 32:  # 16 bytes nonce + 16 bytes tag
        raise ValueError("Encrypted payload too short")

    nonce = payload[:16]
    tag = payload[16:32]
    ciphertext = payload[32:]

    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    try:
        plaintext = cipher.decrypt_and_verify(ciphertext, tag)
    except Exception as exc:
        raise ValueError("Decryption failed") from exc

    return plaintext.decode()
