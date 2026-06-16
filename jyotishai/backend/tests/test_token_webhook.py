"""Unit tests for generate_post_session_assessment in token.py."""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.routers.token import generate_post_session_assessment

SESSION_ID = "test-session-123"

_MESSAGES = [
    {"role": "user",      "content": "Tell me about my career.",  "created_at": "2024-01-01T10:00:00"},
    {"role": "assistant", "content": "Your career looks bright.", "created_at": "2024-01-01T10:00:05"},
]

_ASSESSMENT_JSON = json.dumps({
    "session_summary": "A productive career consultation.",
    "key_insights": ["Strong 10th house placement."],
    "action_items": ["Focus on networking this month."],
})


def _make_supabase_mock(rows=None):
    """Return a Supabase mock that yields `rows` for session_messages queries."""
    mock_db = MagicMock()
    chain = mock_db.table.return_value
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.order.return_value = chain
    chain.execute.return_value = MagicMock(data=rows if rows is not None else _MESSAGES)
    chain.update.return_value = chain
    return mock_db


def _make_openrouter_response(status=200, body=None):
    mock_resp = MagicMock()
    mock_resp.status_code = status
    mock_resp.text = body or ""
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": _ASSESSMENT_JSON}}]
    }
    return mock_resp


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_assessment_persists_on_success():
    """Full happy path: messages fetched, OpenRouter called, DB updated."""
    mock_db = _make_supabase_mock()
    mock_response = _make_openrouter_response()

    mock_http = AsyncMock()
    mock_http.__aenter__ = AsyncMock(return_value=mock_http)
    mock_http.__aexit__ = AsyncMock(return_value=False)
    mock_http.post = AsyncMock(return_value=mock_response)

    with patch("app.routers.token.supabase", mock_db), \
         patch("app.routers.token.httpx.AsyncClient", return_value=mock_http):
        await generate_post_session_assessment(SESSION_ID)

    # Verify OpenRouter was called
    mock_http.post.assert_awaited_once()
    call_kwargs = mock_http.post.call_args
    payload = call_kwargs.kwargs.get("json") or call_kwargs.args[1] if len(call_kwargs.args) > 1 else call_kwargs.kwargs["json"]
    assert payload["model"] == "openai/gpt-4o-mini"
    assert payload["response_format"] == {"type": "json_object"}

    # Verify transcript contains both turns
    user_msg = payload["messages"][1]["content"]
    assert "USER: Tell me about my career." in user_msg
    assert "ASSISTANT: Your career looks bright." in user_msg

    # Verify DB update was called
    mock_db.table.return_value.update.assert_called_once()


# ---------------------------------------------------------------------------
# Empty transcript — early return
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_assessment_skipped_when_no_messages():
    """No OpenRouter call and no DB update when transcript is empty."""
    mock_db = _make_supabase_mock(rows=[])
    mock_http = AsyncMock()

    with patch("app.routers.token.supabase", mock_db), \
         patch("app.routers.token.httpx.AsyncClient", return_value=mock_http):
        await generate_post_session_assessment(SESSION_ID)

    mock_http.post.assert_not_called()
    mock_db.table.return_value.update.assert_not_called()


# ---------------------------------------------------------------------------
# OpenRouter non-200 — no DB update, no exception raised
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_assessment_handles_openrouter_error_gracefully():
    """Non-200 from OpenRouter logs error and leaves assessment as null."""
    mock_db = _make_supabase_mock()
    mock_response = _make_openrouter_response(status=500, body="Internal Server Error")

    mock_http = AsyncMock()
    mock_http.__aenter__ = AsyncMock(return_value=mock_http)
    mock_http.__aexit__ = AsyncMock(return_value=False)
    mock_http.post = AsyncMock(return_value=mock_response)

    with patch("app.routers.token.supabase", mock_db), \
         patch("app.routers.token.httpx.AsyncClient", return_value=mock_http):
        # Must not raise
        await generate_post_session_assessment(SESSION_ID)

    mock_db.table.return_value.update.assert_not_called()
