"""Unit tests for chart_engine.py — Western Tropical ephemeris and OpenRouter report."""
import asyncio
import datetime
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.chart_engine import (
    _FALLBACK_REPORT,
    compute_raw_western_data,
    generate_human_report,
)

# ---------------------------------------------------------------------------
# compute_raw_western_data
# ---------------------------------------------------------------------------

KNOWN_DATE = datetime.date(1990, 5, 1)
KNOWN_TIME = datetime.time(8, 0)
KNOWN_CITY = "New York"

EXPECTED_PLANETS = {
    "sun", "moon", "mercury", "venus", "mars",
    "jupiter", "saturn", "uranus", "neptune", "pluto",
}


def test_compute_raw_western_data_structure():
    """Returns all 10 planets, 12 house keys, and both angle keys."""
    result = compute_raw_western_data(KNOWN_DATE, KNOWN_TIME, KNOWN_CITY)

    assert "planets" in result
    assert "houses" in result
    assert "angles" in result
    assert "_meta" in result

    # Exactly 10 planets
    assert set(result["planets"].keys()) == EXPECTED_PLANETS

    # Exactly 12 house keys "1" through "12"
    assert set(result["houses"].keys()) == {str(i) for i in range(1, 13)}

    # Both angle keys present
    assert "ascendant" in result["angles"]
    assert "midheaven" in result["angles"]


def test_compute_raw_western_data_degrees_in_range():
    """All planet and house degrees are in [0, 30)."""
    result = compute_raw_western_data(KNOWN_DATE, KNOWN_TIME, KNOWN_CITY)

    for name, planet in result["planets"].items():
        assert 0 <= planet["degree"] < 30, f"{name} degree out of range: {planet['degree']}"

    for key, house in result["houses"].items():
        assert 0 <= house["degree"] < 30, f"house {key} degree out of range: {house['degree']}"


def test_compute_raw_western_data_house_numbers():
    """All planet house assignments are integers 1–12."""
    result = compute_raw_western_data(KNOWN_DATE, KNOWN_TIME, KNOWN_CITY)

    for name, planet in result["planets"].items():
        assert isinstance(planet["house"], int), f"{name} house is not int"
        assert 1 <= planet["house"] <= 12, f"{name} house out of range: {planet['house']}"


def test_compute_raw_western_data_meta():
    """_meta contains latitude, longitude, and timezone."""
    result = compute_raw_western_data(KNOWN_DATE, KNOWN_TIME, KNOWN_CITY)
    meta = result["_meta"]
    assert "latitude" in meta
    assert "longitude" in meta
    assert "timezone" in meta
    assert isinstance(meta["latitude"], float)
    assert isinstance(meta["longitude"], float)
    assert isinstance(meta["timezone"], str)


def test_compute_raw_western_data_invalid_city():
    """Raises ValueError for an unrecognisable city name."""
    with pytest.raises(ValueError):
        compute_raw_western_data(KNOWN_DATE, KNOWN_TIME, "xyzzy_nonexistent_city_12345")


# ---------------------------------------------------------------------------
# generate_human_report — fallback when API key is empty
# ---------------------------------------------------------------------------

def test_generate_human_report_fallback_empty_key():
    """Returns fallback dict immediately when OPENROUTER_API_KEY is empty."""
    with patch("app.services.chart_engine.settings") as mock_settings:
        mock_settings.openrouter_api_key = ""
        result = asyncio.run(generate_human_report({"planets": {}, "_meta": {}}))

    assert "hustle_tab" in result
    assert "love_tab" in result
    assert "growth_tab" in result
    assert "money_tab" in result
    assert "your_natural_style" in result["hustle_tab"]


def test_generate_human_report_fallback_none_key():
    """Returns fallback dict immediately when OPENROUTER_API_KEY is None."""
    with patch("app.services.chart_engine.settings") as mock_settings:
        mock_settings.openrouter_api_key = None
        result = asyncio.run(generate_human_report({"planets": {}, "_meta": {}}))

    assert result["hustle_tab"] == _FALLBACK_REPORT["hustle_tab"]
    assert result["love_tab"] == _FALLBACK_REPORT["love_tab"]
    assert result["growth_tab"] == _FALLBACK_REPORT["growth_tab"]
    assert result["money_tab"] == _FALLBACK_REPORT["money_tab"]


# ---------------------------------------------------------------------------
# generate_human_report — success path with mocked httpx
# ---------------------------------------------------------------------------

_MOCK_HUSTLE = {
    "your_natural_style": "Style goes here.",
    "the_biggest_block": "Block goes here.",
    "how_to_fix_it": "Fix goes here.",
    "identity_cards": [
        { "symbol": "⚡", "tagline": "Your soul work", "word": "Entrepreneur" },
        { "symbol": "🎯", "tagline": "Your work style", "word": "Architect" },
        { "symbol": "🔥", "tagline": "Your drive", "word": "Builder" }
    ],
    "past_transit": _FALLBACK_REPORT["hustle_tab"]["past_transit"],
    "current_transit": _FALLBACK_REPORT["hustle_tab"]["current_transit"],
    "future_transit": _FALLBACK_REPORT["hustle_tab"]["future_transit"]
}

_MOCK_MONEY = {
    "your_financial_mindset": "Mindset goes here.",
    "the_money_trap": "Trap goes here.",
    "cash_advice": "Advice goes here.",
    "identity_cards": [
        { "symbol": "💎", "tagline": "Your money type", "word": "Investor" },
        { "symbol": "🏦", "tagline": "Your wealth style", "word": "Accumulator" },
        { "symbol": "📈", "tagline": "Your risk profile", "word": "Strategist" }
    ],
    "past_transit": _FALLBACK_REPORT["money_tab"]["past_transit"],
    "current_transit": _FALLBACK_REPORT["money_tab"]["current_transit"],
    "future_transit": _FALLBACK_REPORT["money_tab"]["future_transit"]
}

_MOCK_GROWTH = {
    "public_mask": "Mask goes here.",
    "private_reality": "Reality goes here.",
    "mental_reset": "Reset goes here.",
    "identity_cards": [
        { "symbol": "🌙", "tagline": "Your inner nature", "word": "Observer" },
        { "symbol": "🧠", "tagline": "Your mind type", "word": "Analyst" },
        { "symbol": "🎭", "tagline": "Your shadow self", "word": "Perfectionist" }
    ],
    "past_transit": _FALLBACK_REPORT["growth_tab"]["past_transit"],
    "current_transit": _FALLBACK_REPORT["growth_tab"]["current_transit"],
    "future_transit": _FALLBACK_REPORT["growth_tab"]["future_transit"]
}

_MOCK_LOVE = {
    "what_you_actually_crave": "Crave goes here.",
    "the_romantic_fear": "Fear goes here.",
    "heart_advice": "Advice goes here.",
    "identity_cards": [
        { "symbol": "✦", "tagline": "Your love style", "word": "Soulseeker" },
        { "symbol": "🌊", "tagline": "Your depth", "word": "Intense" },
        { "symbol": "🔐", "tagline": "Your attachment", "word": "Selective" }
    ],
    "past_transit": _FALLBACK_REPORT["love_tab"]["past_transit"],
    "current_transit": _FALLBACK_REPORT["love_tab"]["current_transit"],
    "future_transit": _FALLBACK_REPORT["love_tab"]["future_transit"]
}

_MOCK_REPORT = {
    "hustle_tab": _MOCK_HUSTLE,
    "money_tab": _MOCK_MONEY,
    "growth_tab": _MOCK_GROWTH,
    "love_tab": _MOCK_LOVE
}


def test_generate_human_report_success_path():
    """Parses choices[0].message.content from a mocked 200 response."""
    # Step 1 mock response (enriched payload)
    mock_step1_data = {
        "core_identity": {
            "conflict_name": "identity conflict",
            "internal_experience": "experience",
            "sabotage_pattern": "sabotage",
            "hidden_gift": "gift"
        },
        "career_truth": "career",
        "love_truth": "love",
        "personal_truth": "personal"
    }
    
    mock_response_1 = MagicMock()
    mock_response_1.status_code = 200
    mock_response_1.json.return_value = {
        "choices": [{"message": {"content": json.dumps(mock_step1_data)}}]
    }

    mock_response_2 = MagicMock()
    mock_response_2.status_code = 200
    mock_response_2.json.return_value = {
        "choices": [{"message": {"content": json.dumps(_MOCK_REPORT)}}]
    }

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    # Return Step 1 data on first call, Step 2 report on second call
    mock_client.post = AsyncMock(side_effect=[mock_response_1, mock_response_2])

    raw_data = {"planets": {"sun": {"sign": "Taurus", "house": 12}}, "_meta": {"latitude": 40.7}}

    with patch("app.services.chart_engine.settings") as mock_settings, \
         patch("app.services.chart_engine.httpx.AsyncClient", return_value=mock_client):
        mock_settings.openrouter_api_key = "test-key"
        result = asyncio.run(generate_human_report(raw_data))

    assert result["hustle_tab"] == _MOCK_REPORT["hustle_tab"]
    assert result["love_tab"] == _MOCK_REPORT["love_tab"]
    assert result["growth_tab"] == _MOCK_REPORT["growth_tab"]
    assert result["money_tab"] == _MOCK_REPORT["money_tab"]
    assert mock_client.post.call_count == 2
    
    # Verify Step 1 payload
    first_call_args = mock_client.post.call_args_list[0]
    _, kwargs = first_call_args
    step1_json = kwargs["json"]
    assert step1_json["model"] == "google/gemma-4-31b-it:free"
    assert step1_json["max_tokens"] == 4000
    assert step1_json["messages"][0]["role"] == "system"
    assert "wise, old local Indian astrologer" in step1_json["messages"][0]["content"]

    # Verify Step 2 payload
    second_call_args = mock_client.post.call_args_list[1]
    _, kwargs = second_call_args
    step2_json = kwargs["json"]
    assert step2_json["model"] == "openai/gpt-oss-120b:free"
    assert step2_json["max_tokens"] == 4000
    assert step2_json["messages"][0]["role"] == "system"


def test_generate_human_report_non_200_returns_fallback():
    """Returns fallback dict on a non-200 HTTP response."""
    mock_response = MagicMock()
    mock_response.status_code = 500

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.services.chart_engine.settings") as mock_settings, \
         patch("app.services.chart_engine.httpx.AsyncClient", return_value=mock_client):
        mock_settings.openrouter_api_key = "test-key"
        result = asyncio.run(generate_human_report({"planets": {}}))

    assert result["hustle_tab"] == _FALLBACK_REPORT["hustle_tab"]
    assert result["love_tab"] == _FALLBACK_REPORT["love_tab"]
    assert result["growth_tab"] == _FALLBACK_REPORT["growth_tab"]
    assert result["money_tab"] == _FALLBACK_REPORT["money_tab"]
