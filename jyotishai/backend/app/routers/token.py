import json
import logging
import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from livekit import api as livekit_api

from app.auth import get_current_user
from app.config import settings
from app.db.supabase import supabase
from app.models.schemas import SessionAssessment, SessionCompleteRequest

logger = logging.getLogger(__name__)

router = APIRouter()

class TokenRequest(BaseModel):
    chart_id: str

class TokenResponse(BaseModel):
    token: str
    room_name: str
    session_id: str
    livekit_url: str

@router.post("/generate", response_model=TokenResponse)
async def generate_token(req: TokenRequest, user=Depends(get_current_user)):
    user_id = user["sub"]
    
    # Verify the chart belongs to this user
    chart_result = supabase.table("birth_charts").select("id, user_id").eq("id", req.chart_id).execute()
    if not chart_result.data or chart_result.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Chart not found or not owned by user")
    
    # Create a unique room name for this session
    room_name = f"session_{user_id[:8]}_{uuid.uuid4().hex[:8]}"
    
    # Create a session record in Supabase
    session_result = supabase.table("sessions").insert({
        "user_id": user_id,
        "birth_chart_id": req.chart_id,
        "livekit_room": room_name,
        "status": "active",
        "started_at": datetime.now().isoformat()
    }).execute()
    
    session_id = session_result.data[0]["id"]
    logger.info(f"Created session {session_id} for room {room_name} with chart {req.chart_id}")
    
    # Generate LiveKit access token
    token = livekit_api.AccessToken(
        api_key=settings.livekit_api_key,
        api_secret=settings.livekit_api_secret
    )
    token.with_identity(user_id)
    token.with_name(user.get("email", "User"))
    token.with_grants(livekit_api.VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
    ))
    
    return TokenResponse(
        token=token.to_jwt(),
        room_name=room_name,
        session_id=session_id,
        livekit_url=settings.livekit_url
    )

async def generate_post_session_assessment(session_id: str) -> None:
    """Compile transcript from session_messages, call OpenRouter, and persist the assessment."""
    try:
        messages_result = supabase.table("session_messages")\
            .select("role, content, created_at")\
            .eq("session_id", session_id)\
            .order("created_at", desc=False)\
            .execute()

        rows = messages_result.data or []
        if not rows:
            logger.info("No messages for session %s — skipping assessment", session_id)
            return

        transcript_lines = [
            f"{'USER' if r['role'] == 'user' else 'ASSISTANT'}: {r['content']}"
            for r in rows
        ]
        transcript = "\n".join(transcript_lines)

        system_prompt = (
            "You are an expert astrology session analyst. "
            "Given the transcript of a voice consultation between a user and an AI astrologer named Celeste, "
            "produce a structured JSON assessment with exactly these keys:\n"
            "  session_summary: a concise paragraph summarising the session\n"
            "  key_insights: a list of 3-5 key astrological insights discussed\n"
            "  action_items: a list of 2-4 concrete action items the user can take\n"
            "Return ONLY valid JSON — no markdown fences, no extra keys."
        )

        payload = {
            "model": "openai/gpt-4o-mini",
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Session transcript:\n\n{transcript}"},
            ],
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code != 200:
            logger.error(
                "OpenRouter returned %s for session %s assessment: %s",
                response.status_code, session_id, response.text,
            )
            return

        raw = response.json()["choices"][0]["message"]["content"]
        assessment_dict = json.loads(raw)
        assessment = SessionAssessment(**assessment_dict)

        supabase.table("sessions").update({
            "assessment": assessment.model_dump()
        }).eq("id", session_id).execute()

        logger.info("Assessment persisted for session %s", session_id)

    except Exception as exc:
        logger.error("Failed to generate assessment for session %s: %s", session_id, exc)


@router.post("/webhook")
async def livekit_webhook(request: Request):
    """Called by LiveKit when room events happen (participant joined, room finished, etc)."""
    try:
        body = await request.json()

        event = body.get("event")
        room = body.get("room", {})
        room_name = room.get("name", "")

        if event == "room_finished":
            session_result = supabase.table("sessions")\
                .select("id, started_at")\
                .eq("livekit_room", room_name)\
                .execute()

            if session_result.data:
                session = session_result.data[0]
                started = datetime.fromisoformat(session["started_at"])
                duration_secs = int((datetime.now() - started).total_seconds())

                supabase.table("sessions").update({
                    "status": "ended",
                    "ended_at": datetime.now().isoformat(),
                    "duration_secs": duration_secs,
                }).eq("id", session["id"]).execute()

                await generate_post_session_assessment(session["id"])

        return {"received": True}
    except Exception as e:
        logger.error("Webhook handler error: %s", e)
        return {"error": str(e), "received": True}


@router.post("/session/complete")
async def session_complete(req: SessionCompleteRequest):
    """
    Called by the LiveKit agent when a session completes.
    Receives transcript and session metadata for processing.
    """
    try:
        logger.info(
            f"Session complete: {req.session_id}, "
            f"reason: {req.end_reason}, turns: {len(req.transcript)}, "
            f"duration: {req.duration_seconds}s"
        )
        
        # Update session with metadata if available
        if req.transcript:
            # Extract speaker info for analysis
            speakers = set(m.get("speaker", "unknown") for m in req.transcript)
            logger.info(f"Session {req.session_id} speakers: {speakers}")
        
        return {"received": True, "session_id": req.session_id}
    except Exception as e:
        logger.error("Session complete handler error: %s", e)
        return {"error": str(e), "received": True}
