import asyncio

import requests


class GeoIPService:
    """Best-effort GeoIP lookups for resolved exit IPs."""

    async def resolve_countries(self, ips: list[str]) -> dict[str, dict[str, str]]:
        if not ips:
            return {}

        unique_ips = list(set(ips))
        result_map: dict[str, dict[str, str]] = {}

        for index in range(0, len(unique_ips), 100):
            batch = unique_ips[index : index + 100]
            try:
                response = await asyncio.to_thread(
                    requests.post,
                    "http://ip-api.com/batch",
                    json=[
                        {"query": ip, "fields": "query,country,countryCode,city"}
                        for ip in batch
                    ],
                    timeout=10,
                )
                if response.status_code != 200:
                    continue

                for item in response.json():
                    query = item.get("query", "")
                    result_map[query] = {
                        "country": item.get("country", ""),
                        "countryCode": item.get("countryCode", ""),
                        "city": item.get("city", ""),
                    }
            except Exception:  # pragma: no cover - network/runtime dependent
                continue

        return result_map
