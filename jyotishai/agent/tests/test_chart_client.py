"""
Unit tests for chart_client.fetch_chart_data.

Tests verify:
- Correct endpoint and headers are used
- Full chart dict is returned on HTTP 200
- Empty dict is returned on non-200 responses
- Empty dict is returned on request timeout
"""
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Ensure the agent package root is on the path so chart_client can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from chart_client import fetch_chart_data  # noqa: E402

BACKEND_URL = "http://localhost:8000"
ROOM_NAME = "session_test_room_001"
EXPECTED_ENDPOINT = f"{BACKEND_URL}/agent/chart-for-room"
FAKE_SECRET = "test-secret"

SAMPLE_CHART = {
    "full_name": "Jane Doe",
    "detailed_report": {
        "personal": {"past": "...", "current": "...", "future": "..."},
        "career": {"past": "...", "current": "...", "future": "..."},
        "love": {"past": "...", "current": "...", "future": "..."},
    },
}


def _make_mock_response(status_code: int, json_data=None):
    """Build a mock httpx.Response."""
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.json.return_value = json_data or {}
    return mock_resp


@pytest.mark.asyncio
async def test_fetch_chart_data_success():
    """Returns the full chart dict when the backend responds with 200."""
    mock_response = _make_mock_response(200, SAMPLE_CHART)

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("chart_client.httpx.AsyncClient", return_value=mock_client), \
         patch("chart_client.BACKEND_SECRET", FAKE_SECRET), \
         patch("chart_client.BACKEND_URL", BACKEND_URL):
        result = await fetch_chart_data(ROOM_NAME)

    assert result == SAMPLE_CHART
    mock_client.get.assert_called_once_with(
        EXPECTED_ENDPOINT,
        params={"room": ROOM_NAME},
        headers={"X-Agent-Secret": FAKE_SECRET},
        timeout=10.0,
    )


@pytest.mark.asyncio
async def test_fetch_chart_data_non_200_returns_empty_dict():
    """Returns an empty dict when the backend returns a non-200 status."""
    for status_code in [400, 404, 500, 503]:
        mock_response = _make_mock_response(status_code)

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("chart_client.httpx.AsyncClient", return_value=mock_client), \
             patch.dict(os.environ, {"BACKEND_URL": BACKEND_URL, "BACKEND_AGENT_SECRET": FAKE_SECRET}):
            result = await fetch_chart_data(ROOM_NAME)

        assert result == {}, f"Expected empty dict for status {status_code}, got {result}"


@pytest.mark.asyncio
async def test_fetch_chart_data_timeout_returns_empty_dict():
    """Returns an empty dict when the request times out."""
    import httpx

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timed out"))

    with patch("chart_client.httpx.AsyncClient", return_value=mock_client), \
         patch.dict(os.environ, {"BACKEND_URL": BACKEND_URL, "BACKEND_AGENT_SECRET": FAKE_SECRET}):
        result = await fetch_chart_data(ROOM_NAME)

    assert result == {}
