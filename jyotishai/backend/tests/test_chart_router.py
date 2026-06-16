"""Integration tests for POST /chart/compute endpoint."""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Shared test fixtures
# ---------------------------------------------------------------------------

_CHART_ID = str(uuid.uuid4())
_USER_ID = str(uuid.uuid4())

_RAW_ASTRO = {
    "planets": {
        "sun":     {"sign": "Taurus",      "degree": 10.5, "house": 9,  "is_retrograde": False},
        "moon":    {"sign": "Capricorn",   "degree": 5.2,  "house": 5,  "is_retrograde": False},
        "mercury": {"sign": "Aries",       "degree": 28.1, "house": 8,  "is_retrograde": False},
        "venus":   {"sign": "Gemini",      "degree": 3.7,  "house": 10, "is_retrograde": False},
        "mars":    {"sign": "Aquarius",    "degree": 17.9, "house": 6,  "is_retrograde": False},
        "jupiter": {"sign": "Cancer",      "degree": 22.0, "house": 11, "is_retrograde": False},
        "saturn":  {"sign": "Capricorn",   "degree": 24.3, "house": 5,  "is_retrograde": False},
        "uranus":  {"sign": "Capricorn",   "degree": 8.6,  "house": 5,  "is_retrograde": False},
        "neptune": {"sign": "Capricorn",   "degree": 14.1, "house": 5,  "is_retrograde": False},
        "pluto":   {"sign": "Scorpio",     "degree": 16.8, "house": 3,  "is_retrograde": False},
    },
    "houses": {str(i): {"sign": "Aries", "degree": float(i)} for i in range(1, 13)},
    "angles": {
        "ascendant": {"sign": "Leo",    "degree": 11.2},
        "midheaven": {"sign": "Taurus", "degree": 9.1},
    },
    "_meta": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "timezone": "America/New_York",
    },
}

_HUSTLE_TAB = {
    "your_natural_style": "Style goes here.",
    "the_biggest_block": "Block goes here.",
    "how_to_fix_it": "Fix goes here."
}

_MONEY_TAB = {
    "your_financial_mindset": "Mindset goes here.",
    "the_money_trap": "Trap goes here.",
    "cash_advice": "Advice goes here."
}

_GROWTH_TAB = {
    "public_mask": "Mask goes here.",
    "private_reality": "Reality goes here.",
    "mental_reset": "Reset goes here."
}

_LOVE_TAB = {
    "what_you_actually_crave": "Crave goes here.",
    "the_romantic_fear": "Fear goes here.",
    "heart_advice": "Advice goes here."
}

_DETAILED_REPORT = {
    "age": 25,
    "timeframes": {
        "past": "Ages 20 to 24",
        "present": "Age 25 | Right Now",
        "future": "Ages 26 to 30"
    },
    "hustle_tab": _HUSTLE_TAB,
    "money_tab": _MONEY_TAB,
    "growth_tab": _GROWTH_TAB,
    "love_tab": _LOVE_TAB
}

_DB_ROW = {
    "id": _CHART_ID,
    "full_name": "Jane Doe",
    "raw_astrology_data": {k: v for k, v in _RAW_ASTRO.items() if k != "_meta"},
    "detailed_report": _DETAILED_REPORT,
}

_REQUEST_BODY = {
    "full_name": "Jane Doe",
    "birth_date": "1990-05-01",
    "birth_time": "08:00:00",
    "birth_city": "New York",
    "gender": "female",
    "user_id": _USER_ID,
}


# ---------------------------------------------------------------------------
# POST /chart/compute — happy path
# ---------------------------------------------------------------------------

def test_compute_chart_returns_201():
    """POST /chart/compute returns HTTP 201 with a valid ChartResponse body."""
    mock_db = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[_DB_ROW])

    with patch("app.routers.chart.compute_raw_western_data", return_value=_RAW_ASTRO), \
         patch("app.routers.chart.generate_human_report", new=AsyncMock(return_value=_DETAILED_REPORT)), \
         patch("app.routers.chart.get_supabase_client", return_value=mock_db):

        response = client.post("/chart/compute", json=_REQUEST_BODY)

    assert response.status_code == 201
    body = response.json()
    assert body["chart_id"] == _CHART_ID
    assert body["full_name"] == "Jane Doe"
    assert body["message"] == "Chart computed successfully for Jane Doe"
    assert "raw_astrology_data" in body
    assert "detailed_report" in body


def test_compute_chart_detailed_report_shape():
    """Returned detailed_report has hustle_tab, love_tab, growth_tab, and money_tab fields."""
    mock_db = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[_DB_ROW])

    with patch("app.routers.chart.compute_raw_western_data", return_value=_RAW_ASTRO), \
         patch("app.routers.chart.generate_human_report", new=AsyncMock(return_value=_DETAILED_REPORT)), \
         patch("app.routers.chart.get_supabase_client", return_value=mock_db):

         response = client.post("/chart/compute", json=_REQUEST_BODY)

    report = response.json()["detailed_report"]
    assert "hustle_tab" in report
    assert "love_tab" in report
    assert "growth_tab" in report
    assert "money_tab" in report
    assert "your_natural_style" in report["hustle_tab"]
    assert "the_biggest_block" in report["hustle_tab"]
    assert "how_to_fix_it" in report["hustle_tab"]


# ---------------------------------------------------------------------------
# POST /chart/compute — error paths
# ---------------------------------------------------------------------------

def test_compute_chart_geocoding_error_returns_400():
    """ValueError from compute_raw_western_data propagates as HTTP 400."""
    with patch("app.routers.chart.compute_raw_western_data", side_effect=ValueError("City not found")):
        response = client.post("/chart/compute", json=_REQUEST_BODY)

    assert response.status_code == 400
    assert "City not found" in response.json()["detail"]


def test_compute_chart_ephemeris_error_returns_500():
    """Generic exception from compute_raw_western_data propagates as HTTP 500."""
    with patch("app.routers.chart.compute_raw_western_data", side_effect=RuntimeError("ephe failure")):
        response = client.post("/chart/compute", json=_REQUEST_BODY)

    assert response.status_code == 500


def test_compute_chart_db_empty_returns_500():
    """HTTP 500 when Supabase insert returns no data."""
    mock_db = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])

    with patch("app.routers.chart.compute_raw_western_data", return_value=_RAW_ASTRO), \
         patch("app.routers.chart.generate_human_report", new=AsyncMock(return_value=_DETAILED_REPORT)), \
         patch("app.routers.chart.get_supabase_client", return_value=mock_db):

        response = client.post("/chart/compute", json=_REQUEST_BODY)

    assert response.status_code == 500
    assert "persist" in response.json()["detail"].lower()
