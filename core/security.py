"""
EDUAGENT Security and Access Control Module
"""
import hashlib
import hmac
import secrets
from typing import Tuple

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a unique salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}${key.hex()}"

def verify_password(stored_hash: str, provided_password: str) -> bool:
    """Verify a password against stored salt$hash string."""
    try:
        salt, key_hex = stored_hash.split('$')
        computed_key = hashlib.pbkdf2_hmac(
            'sha256',
            provided_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return hmac.compare_digest(key_hex, computed_key.hex())
    except Exception:
        return False

def verify_admin_password(input_password: str, correct_password: str) -> bool:
    """Constant-time verification for admin credential."""
    return hmac.compare_digest(input_password.strip(), correct_password.strip())
