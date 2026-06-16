"""Unit tests for GET /sessions/user/{user_id} endpoint."""
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth import get_current_user

client = TestClient(app)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

_USER_ID = str(uuid.uuid4())
_OTHER_USER_ID = str(uuid.uuid4())
_SESSION_ID_1 = str(uuid.uuid4())
_SESSION_ID_2 = str(uuid.uuid4())

_SESSIONS = [
    {
        "id": _SESSION_ID_1,
        "livekit_room": "session_abc_00000001",
        "status": "ended",
        "started_at": "2026-05-22T10:00:00Z",
        "duration_secs": 345,
        "assessment": {
            "session_summary": "A productive career consultation.",
            "key_insights": ["Strong 10th house placement."],
            "action_items": ["Focus on networking this month."],
        },
    },
    {
        "id": _SESSION_ID_2,
        "livekit_room": "session_abc_00000002",
        "status": "ended",
        "started_at": "2026-05-20T09:00:00Z",
        "duration_secs": 180,
        "assessment": None,
    },
]

_MESSAGES = [
    {"session_id": _SESSION_ID_1, "role": "user",      "content": "Tell me about my career."},
    {"session_id": _SESSION_ID_1, "role": "assistant",  "content": "Your career looks bright."},
    {"session_id": _SESSION_ID_2, "role": "user",      "content": "What about love?"},
]

_VALID_USER_PAYLOAD = {"sub": _USER_ID, "email": "user@example.com"}


def _make_supabase_mock(sessions=None, messages=None):
    """Build a Supabase mock that returns the given sessions and messages."""
    mock_db = MagicMock()

    sessions_chain = MagicMock()
    sessions_chain.select.return_value = sessions_chain
    sessions_chain.eq.return_value = sessions_chain
    sessions_chain.order.return_value = sessions_chain
    sessions_chain.execute.return_value = MagicMock(data=sessions if sessions is not None else _SESSIONS)

    messages_chain = MagicMock()
    messages_chain.select.return_value = messages_chain
    messages_chain.in_.return_value = messages_chain
    messages_chain.order.return_value = messages_chain
    messages_chain.execute.return_value = MagicMock(data=messages if messages is not None else _MESSAGES)

    def table_side_effect(name):
        if name == "sessions":
            return sessions_chain
        if name == "session_messages":
            return messages_chain
        return MagicMock()

    mock_db.table.side_effect = table_side_effect
    return mock_db


# ---------------------------------------------------------------------------
# 401 — no JWT (FastAPI HTTPBearer returns 403 when no credentials provided)
# ---------------------------------------------------------------------------

def test_get_sessions_returns_403_without_jwt():
    """Request without Authorization header is rejected (HTTPBearer returns 403)."""
    response = client.get(f"/sessions/user/{_USER_ID}")
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# 403 — user_id mismatch
# ---------------------------------------------------------------------------

def test_get_sessions_returns_403_on_user_id_mismatch():
    """JWT sub does not match path user_id → 403."""
    mock_db = _make_supabase_mock()

    app.dependency_overrides[get_current_user] = lambda: _VALID_USER_PAYLOAD
    try:
        with patch("app.routers.sessions.supabase", mock_db):
            response = client.get(f"/sessions/user/{_OTHER_USER_ID}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]


# ---------------------------------------------------------------------------
# 200 — empty sessions array
# ---------------------------------------------------------------------------

def test_get_sessions_returns_200_with_empty_array_when_no_sessions():
    """No sessions for user → 200 with empty sessions array."""
    mock_db = _make_supabase_mock(sessions=[], messages=[])

    app.dependency_overrides[get_current_user] = lambda: _VALID_USER_PAYLOAD
    try:
        with patch("app.routers.sessions.supabase", mock_db):
            response = client.get(f"/sessions/user/{_USER_ID}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"sessions": []}


# ---------------------------------------------------------------------------
# 200 — sessions with nested messages
# ---------------------------------------------------------------------------

def test_get_sessions_returns_sessions_with_nested_messages():
    """Happy path: sessions returned with messages nested per session."""
    mock_db = _make_supabase_mock()

    app.dependency_overrides[get_current_user] = lambda: _VALID_USER_PAYLOAD
    try:
        with patch("app.routers.sessions.supabase", mock_db):
            response = client.get(f"/sessions/user/{_USER_ID}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    sessions = body["sessions"]
    assert len(sessions) == 2

    # First session has 2 messages
    s1 = next(s for s in sessions if s["id"] == _SESSION_ID_1)
    assert len(s1["messages"]) == 2
    assert s1["messages"][0] == {"role": "user", "content": "Tell me about my career."}
    assert s1["assessment"]["session_summary"] == "A productive career consultation."

    # Second session has 1 message and null assessment
    s2 = next(s for s in sessions if s["id"] == _SESSION_ID_2)
    assert len(s2["messages"]) == 1
    assert s2["assessment"] is None


# ---------------------------------------------------------------------------
# Response shape
# ---------------------------------------------------------------------------

def test_get_sessions_response_shape():
    """Each session in the response has all required fields."""
    mock_db = _make_supabase_mock()

    app.dependency_overrides[get_current_user] = lambda: _VALID_USER_PAYLOAD
    try:
        with patch("app.routers.sessions.supabase", mock_db):
            response = client.get(f"/sessions/user/{_USER_ID}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    session = response.json()["sessions"][0]
    for field in ("id", "livekit_room", "status", "started_at", "duration_secs", "assessment", "messages"):
        assert field in session
