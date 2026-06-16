import json
import logging
import uuid
import httpx
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from app.auth import get_current_user
from app.config import settings
from app.db.supabase import supabase

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    chart_id: str
    message: str
    session_id: Optional[str] = None

class MessageDetail(BaseModel):
    role: str
    content: str
    created_at: Optional[str] = None

class ChatResponse(BaseModel):
    session_id: str
    reply: str
    messages: List[MessageDetail]

def _build_celeste_system_prompt(chart_data: dict) -> str:
    detailed_report = chart_data.get("detailed_report", {})
    full_name = chart_data.get("full_name", "the user")
    first_name = full_name.split()[0] if full_name else "friend"

    return f"""You are Celeste, but you speak and act exactly like a wise, old local Indian astrologer (Panditji/Jyotishi) who has read thousands of horoscopes over forty years.
You are currently in an interactive text chat session with {full_name}.

PERSONALITY & TONE
- Speak with deep grandfatherly wisdom, authority, and warmth. You can address the user warmly (e.g., calling them 'beta' or 'my child' or by their first name).
- Be completely honest, true, and direct. If you see a challenge, point it out. If there is a blessing, tell them.
- Speak in simple, clear English without modern psychological or corporate jargon (avoid words like "resonance", "alignment", "vulnerability", "vibe").
- Predict concrete future outcomes where appropriate, just like a local Indian astrologer would (e.g., "you will become rich", "you will start a business", "you will marry happily but late").
- Keep responses clean and readable. Try to structure your answer in 2–4 short, spacious paragraphs.

HARD RULES
- Respond ONLY using the narrative content from the CHART NARRATIVE section below.
- Do NOT read out raw degree values, house indices, or sign names unless the user explicitly asks for the technical breakdown.
- NEVER make categorical predictions about death, serious illness, or tragedy.
- NEVER give medical or legal advice — redirect to professionals for those.
- Do not mention that you are an AI unless directly asked.

CHART NARRATIVE FOR {full_name.upper()}
The following narrative blocks are the sole source of truth for this session.
Use them to answer all questions about {first_name}'s life, personality, career, and relationships.

{json.dumps(detailed_report, indent=2)}
"""

@router.post("/message", response_model=ChatResponse)
async def chat_message(req: ChatRequest, user=Depends(get_current_user)):
    user_id = user["sub"]
    
    # 1. Fetch and verify birth chart ownership
    chart_res = supabase.table("birth_charts").select("*").eq("id", req.chart_id).execute()
    if not chart_res.data:
        raise HTTPException(status_code=404, detail="Birth chart not found")
    chart = chart_res.data[0]
    if chart["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this chart")
        
    # 2. Get or create session
    session_id = req.session_id
    if not session_id:
        # Create new session
        room_name = f"chat_{user_id[:8]}_{uuid.uuid4().hex[:8]}"
        session_res = supabase.table("sessions").insert({
            "user_id": user_id,
            "birth_chart_id": req.chart_id,
            "livekit_room": room_name,
            "status": "active",
            "started_at": datetime.now().isoformat()
        }).execute()
        if not session_res.data:
            raise HTTPException(status_code=500, detail="Failed to create session")
        session_id = session_res.data[0]["id"]
    else:
        # Verify session ownership
        session_res = supabase.table("sessions").select("id, user_id").eq("id", session_id).execute()
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found")
        if session_res.data[0]["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this session")

    # 3. Save User's new message to Supabase
    supabase.table("session_messages").insert({
        "session_id": session_id,
        "role": "user",
        "content": req.message,
        "created_at": datetime.now().isoformat()
    }).execute()

    # 4. Fetch all messages in the session to construct chat history
    messages_res = supabase.table("session_messages") \
        .select("role, content, created_at") \
        .eq("session_id", session_id) \
        .order("created_at", desc=False) \
        .execute()
    
    history = messages_res.data or []

    # 5. Build prompt
    system_prompt = _build_celeste_system_prompt(chart)
    
    # 6. Call OpenRouter
    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        api_messages.append({"role": msg["role"], "content": msg["content"]})
        
    payload = {
        "model": "openai/gpt-oss-120b:free",
        "temperature": 0.7,
        "messages": api_messages
    }

    reply_content = ""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://jyotishai.app",
                    "X-Title": "JyotishAI",
                },
                json=payload
            )
        
        if response.status_code == 200:
            reply_content = response.json()["choices"][0]["message"]["content"]
            # Clean up deepseek thinking tags (<think>...</think>) if present
            if "<think>" in reply_content and "</think>" in reply_content:
                reply_content = reply_content.split("</think>")[-1].strip()
        else:
            logger.error(f"OpenRouter error: {response.status_code} {response.text}")
            reply_content = "I am connecting with the stars, but my reflection is a bit cloudy. Let me try again."
    except Exception as exc:
        logger.error(f"OpenRouter exception: {exc}")
        reply_content = "I encountered an error connecting to the cosmic network. Please try again."

    # 7. Save Assistant's reply to database
    supabase.table("session_messages").insert({
        "session_id": session_id,
        "role": "assistant",
        "content": reply_content,
        "created_at": datetime.now().isoformat()
    }).execute()

    # 8. Fetch final messages list
    updated_messages_res = supabase.table("session_messages") \
        .select("role, content, created_at") \
        .eq("session_id", session_id) \
        .order("created_at", desc=False) \
        .execute()
        
    final_messages = [
        MessageDetail(role=m["role"], content=m["content"], created_at=m["created_at"])
        for m in (updated_messages_res.data or [])
    ]

    return ChatResponse(
        session_id=session_id,
        reply=reply_content,
        messages=final_messages
    )
