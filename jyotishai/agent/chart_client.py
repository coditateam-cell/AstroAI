import httpx
import logging
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("jyotishai-agent")


def _backend_url() -> str:
    return os.getenv("BACKEND_URL", "http://localhost:8000")


def _backend_secret() -> str:
    secret = os.getenv("BACKEND_AGENT_SECRET", "")
    if not secret:
        logger.warning("BACKEND_AGENT_SECRET is not set — agent→backend calls will fail auth")
    return secret


async def fetch_chart_for_room(room_name: str) -> Optional[dict]:
    """
    Given a LiveKit room name, fetch the associated birth chart from the backend.
    The backend looks up the session by room name, then returns the linked chart.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{_backend_url()}/agent/chart-for-room",
            params={"room": room_name},
            headers={"X-Agent-Secret": _backend_secret()},
            timeout=10.0
        )
        logger.info(f"Chart fetch for room {room_name}: status={resp.status_code}, body={resp.text[:200]}")
        if resp.status_code == 200:
            return resp.json()
        return None


async def fetch_chart_data(room_name: str) -> dict:
    """
    Entry point for the agent. Wraps fetch_chart_for_room and always returns a dict.
    Returns the full chart record (including detailed_report and full_name) on success,
    or an empty dict if the fetch fails, times out, or the backend returns a non-200 response.
    """
    try:
        result = await fetch_chart_for_room(room_name)
        return result or {}
    except Exception as exc:
        logger.error(f"fetch_chart_data failed for room {room_name}: {exc}")
        return {}


def build_chart_context(chart: dict) -> str:
    """
    Convert the raw chart JSON into a readable block the LLM can use.
    Structured text is easier for Claude to reason over than raw JSON.
    """
    planets = chart.get("planets", {})

    planet_lines = []
    for name, data in planets.items():
        retro = " (retrograde)" if data.get("retrograde") else ""
        disp_name = name.capitalize()
        if name == "rahu":
            disp_name = "North Node"
        elif name == "ketu":
            disp_name = "South Node"
        planet_lines.append(
            f"  - {disp_name}: {data['sign']} at {data['degree']:.1f}°{retro}"
        )

    houses = chart.get("houses", {})
    house_lines = []
    if houses:
        for i in range(1, 13):
            house_key = f"house_{i}"
            if house_key in houses:
                data = houses[house_key]
                house_lines.append(
                    f"  - House {i}: {data['sign']} Cusp at {data['degree']:.1f}°"
                )

    return f"""
BIRTH CHART DATA (Natal / Tropical)
===================================
Name: {chart.get('full_name', 'the native')}
Ascendant: {chart.get('ascendant', 'Unknown')}
Sun Sign: {chart.get('sun_sign', 'Unknown')}
Moon Sign: {chart.get('moon_sign', 'Unknown')}

PLANETARY POSITIONS (Tropical / Western)
{chr(10).join(planet_lines)}

HOUSE CUSPS (Placidus System)
{chr(10).join(house_lines)}
""".strip()
