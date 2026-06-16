import logging

from fastapi import APIRouter, HTTPException, Header
from app.db.supabase import supabase
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


def verify_agent_secret(x_agent_secret: str = Header(None)):
    if x_agent_secret != settings.backend_agent_secret:
        raise HTTPException(status_code=403, detail="Invalid agent secret")


@router.get("/chart-for-room")
def chart_for_room(room: str, x_agent_secret: str = Header(None)):
    """
    Internal endpoint: given a LiveKit room name, return the associated birth chart.
    Only callable by the agent (verified via shared secret).
    """
    # Verify agent secret
    if x_agent_secret != settings.backend_agent_secret:
        logger.warning(f"Invalid agent secret for room {room}")
        raise HTTPException(status_code=403, detail="Invalid agent secret")
    
    # Find the session for this room
    session_result = supabase.table("sessions")\
        .select("id, birth_chart_id, user_id, livekit_room, status")\
        .eq("livekit_room", room)\
        .execute()

    if not session_result.data:
        # Log all active sessions for debugging
        all_sessions = supabase.table("sessions")\
            .select("id, livekit_room, status")\
            .eq("status", "active")\
            .execute()
        logger.warning(
            f"No session found for room {room}. Active sessions: {all_sessions.data}"
        )
        raise HTTPException(status_code=404, detail="No active session for this room")

    session = session_result.data[0]
    if session["status"] != "active":
        logger.warning(
            f"Session {session['id']} for room {room} has status {session['status']}, not 'active'"
        )
        raise HTTPException(status_code=404, detail="Session is not active")

    chart_id = session["birth_chart_id"]
    user_id = session["user_id"]

    chart_result = supabase.table("birth_charts")\
        .select("*")\
        .eq("id", chart_id)\
        .execute()

    if not chart_result.data:
        logger.error(f"Chart {chart_id} not found for session {session['id']}")
        raise HTTPException(status_code=404, detail="Chart not found")

    chart = chart_result.data[0]
    # Add session_id and user_id for agent use
    chart["session_id"] = session["id"]
    chart["user_id"] = user_id
    
    return chart
