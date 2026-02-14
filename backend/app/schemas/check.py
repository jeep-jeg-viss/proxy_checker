from typing import Literal

from pydantic import BaseModel, Field


class CheckRequest(BaseModel):
    proxies: str
    session_name: str = ""
    tags: list[str] = Field(default_factory=list)
    check_url: str = "https://httpbin.org/ip"
    timeout: int = Field(default=10, ge=1, le=60)
    max_workers: int = Field(default=20, ge=1, le=200)
    proxy_type: Literal["http", "socks5"] = "http"
    delimiter: str = ":"
    field_order: str = "ip:port:user:pass"


class SessionConfig(BaseModel):
    check_url: str
    timeout: int
    max_workers: int
    proxy_type: str
    delimiter: str
    field_order: str
