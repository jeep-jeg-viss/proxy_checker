from pydantic import BaseModel, Field

from .check import SessionConfig


class SessionStats(BaseModel):
    total: int
    alive: int
    dead: int
    avg_latency: int | None
    countries: dict[str, int] = Field(default_factory=dict)


class ProxyResult(BaseModel):
    id: str
    proxy_ip: str
    proxy_port: str
    user: str
    status: str
    exit_ip: str
    response_time_ms: int | None
    error: str
    country: str = ""
    country_code: str = ""
    city: str = ""


class SessionRecord(BaseModel):
    id: str
    owner_sub: str
    name: str
    tags: list[str] = Field(default_factory=list)
    created_at: str
    config: SessionConfig
    results: list[ProxyResult]
    stats: SessionStats
