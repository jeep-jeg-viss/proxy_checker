import asyncio
import time
from typing import Any

import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwt


class Auth0TokenVerifier:
    def __init__(
        self,
        domain: str,
        audience: str,
        algorithms: list[str],
        issuer: str | None = None,
        jwks_ttl_seconds: int = 3600,
    ) -> None:
        normalized_domain = domain.replace("https://", "").rstrip("/")
        self._audience = audience
        self._algorithms = algorithms
        self._issuer = issuer or f"https://{normalized_domain}/"
        self._jwks_url = f"https://{normalized_domain}/.well-known/jwks.json"
        self._jwks_ttl_seconds = jwks_ttl_seconds

        self._jwks_cache: dict[str, Any] | None = None
        self._jwks_expires_at: float = 0.0
        self._lock = asyncio.Lock()

    async def verify_token(self, token: str) -> dict[str, Any]:
        jwks = await self._get_jwks()
        signing_key = self._find_signing_key(token, jwks)
        if signing_key is None:
            jwks = await self._get_jwks(force_refresh=True)
            signing_key = self._find_signing_key(token, jwks)

        if signing_key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find matching Auth0 signing key",
            )

        try:
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=self._algorithms,
                audience=self._audience,
                issuer=self._issuer,
            )
        except JWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            ) from exc

        return payload

    async def _get_jwks(self, force_refresh: bool = False) -> dict[str, Any]:
        now = time.time()
        if (
            not force_refresh
            and self._jwks_cache is not None
            and now < self._jwks_expires_at
        ):
            return self._jwks_cache

        async with self._lock:
            now = time.time()
            if (
                not force_refresh
                and self._jwks_cache is not None
                and now < self._jwks_expires_at
            ):
                return self._jwks_cache

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self._jwks_url)
                response.raise_for_status()
                jwks = response.json()

            self._jwks_cache = jwks
            self._jwks_expires_at = time.time() + self._jwks_ttl_seconds
            return jwks

    @staticmethod
    def _find_signing_key(token: str, jwks: dict[str, Any]) -> dict[str, Any] | None:
        try:
            header = jwt.get_unverified_header(token)
        except JWTError:
            return None

        kid = header.get("kid")
        if not kid:
            return None

        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return {
                    "kty": key.get("kty"),
                    "kid": key.get("kid"),
                    "use": key.get("use"),
                    "n": key.get("n"),
                    "e": key.get("e"),
                }
        return None
