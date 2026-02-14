import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

_ENC_PREFIX = "enc:v1:"


class PasswordCrypto:
    def __init__(self, secret: str) -> None:
        derived_key = hashlib.sha256(secret.encode("utf-8")).digest()
        fernet_key = base64.urlsafe_b64encode(derived_key)
        self._fernet = Fernet(fernet_key)

    def encrypt(self, value: str) -> str:
        if not value:
            return ""
        if value.startswith(_ENC_PREFIX):
            return value
        token = self._fernet.encrypt(value.encode("utf-8")).decode("utf-8")
        return f"{_ENC_PREFIX}{token}"

    def decrypt(self, value: str) -> str:
        if not value:
            return ""
        if not value.startswith(_ENC_PREFIX):
            return value
        token = value[len(_ENC_PREFIX) :]
        try:
            return self._fernet.decrypt(token.encode("utf-8")).decode("utf-8")
        except InvalidToken:
            return ""
