import logging
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any

from app.auth import get_current_user
from app.db.supabase import supabase

logger = logging.getLogger(__name__)

router = APIRouter()


class MessageOut(BaseModel):
    role: str
    content: str


class SessionOut(BaseModel):
    id: str
    livekit_room: str
    status: str
    started_at: str
    duration_secs: int | None
    assessment: Any | None
    messages: list[MessageOut]


class SessionsResponse(BaseModel):
    sessions: list[SessionOut]


@router.get("/user/{user_id}", response_model=SessionsResponse)
async def get_user_sessions(user_id: str, user=Depends(get_current_user)):
    """Return all sessions for the given user, ordered by started_at DESC."""
    jwt_sub = user.get("sub")
    if jwt_sub != user_id:
        raise HTTPException(status_code=403, detail="Access denied: user_id does not match token")

    # Fetch sessions ordered by started_at DESC
    sessions_result = supabase.table("sessions") \
        .select("id, livekit_room, status, started_at, duration_secs, assessment") \
        .eq("user_id", user_id) \
        .order("started_at", desc=True) \
        .execute()

    sessions_data = sessions_result.data or []

    if not sessions_data:
        return SessionsResponse(sessions=[])

    # Batch-fetch all messages for these sessions in a single IN query
    session_ids = [s["id"] for s in sessions_data]
    messages_result = supabase.table("session_messages") \
        .select("session_id, role, content") \
        .in_("session_id", session_ids) \
        .order("created_at", desc=False) \
        .execute()

    # Group messages by session_id
    messages_by_session: dict[str, list[MessageOut]] = defaultdict(list)
    for msg in (messages_result.data or []):
        messages_by_session[msg["session_id"]].append(
            MessageOut(role=msg["role"], content=msg["content"])
        )

    # Assemble response
    sessions_out = [
        SessionOut(
            id=s["id"],
            livekit_room=s["livekit_room"],
            status=s["status"],
            started_at=s["started_at"],
            duration_secs=s.get("duration_secs"),
            assessment=s.get("assessment"),
            messages=messages_by_session[s["id"]],
        )
        for s in sessions_data
    ]

    return SessionsResponse(sessions=sessions_out)
