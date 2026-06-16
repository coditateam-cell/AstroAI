import json
import logging
import os
import time

from dotenv import load_dotenv
from supabase import create_client

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions, cli
from livekit.plugins import deepgram, elevenlabs, openai, silero, sarvam
from livekit.agents import inference

from chart_client import fetch_chart_data

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jyotishai-agent")

# Validate required environment variables at startup
_REQUIRED_ENV_VARS = [
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "OPENROUTER_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "BACKEND_URL",
    "BACKEND_AGENT_SECRET",
]

for _var in _REQUIRED_ENV_VARS:
    if not os.getenv(_var):
        logger.error(f"Missing required environment variable: {_var}")
        raise SystemExit(1)


# ---------------------------------------------------------------------------
# Prewarm function - load VAD model on agent startup for faster first response
# ---------------------------------------------------------------------------

def prewarm(proc):
    """Pre-load VAD model when agent process starts."""
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("VAD model preloaded successfully")


# ---------------------------------------------------------------------------
# Webhook dispatch helper - send session completion to backend
# ---------------------------------------------------------------------------

async def dispatch_session_complete(
    session_id: str,
    end_reason: str,
    transcript: list,
    duration_seconds: int = 0,
) -> None:
    """Send session completion data to backend for processing."""
    import httpx

    payload = {
        "session_id": session_id,
        "end_reason": end_reason,
        "duration_seconds": duration_seconds,
        "transcript": transcript,
    }
    url = f"{os.getenv('BACKEND_URL')}/token/session/complete"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
        if response.status_code < 200 or response.status_code >= 300:
            logger.error(
                "Webhook returned non-2xx: status=%d body=%s",
                response.status_code,
                response.text,
            )
    except Exception as exc:
        logger.error("Webhook dispatch failed: %s", exc, exc_info=True)


# ---------------------------------------------------------------------------
# Transcript collection helper - extract conversation from session history
# ---------------------------------------------------------------------------

def _collect_transcript(session) -> list:
    """Extract transcript from session history for backend reporting."""
    transcript = []
    try:
        # Access session history if available
        if hasattr(session, 'history') and hasattr(session.history, 'messages'):
            for msg in session.history.messages():
                role = str(getattr(msg, "role", ""))
                if role in ("system", "developer"):
                    continue
                speaker = "agent" if role == "assistant" else "user"
                text = getattr(msg, "content", "") or ""
                if isinstance(text, list):
                    text = " ".join(
                        part.get("text", "") if isinstance(part, dict) else str(part)
                        for part in text
                    )
                text = str(text).strip()
                if text:
                    transcript.append({
                        "speaker": speaker,
                        "text": text,
                        "created_at": time.time(),
                    })
    except Exception as exc:
        logger.warning("Failed to extract transcript: %s", exc)
    return transcript


# ---------------------------------------------------------------------------
# Database helpers - store session metadata
# ---------------------------------------------------------------------------

def _store_session_metadata(supabase, session_id: str, room_name: str, chart_data: dict) -> None:
    """Store additional session metadata for reporting and analytics."""
    try:
        full_name = chart_data.get("full_name", "")
        first_name = full_name.split()[0] if full_name else ""
        
        metadata = {
            "full_name": full_name,
            "first_name": first_name,
            "chart_id": chart_data.get("chart_id"),
            "user_id": chart_data.get("user_id"),
        }
        
        supabase.table("sessions").update({"metadata": metadata}).eq("id", session_id).execute()
        logger.info("Session metadata stored for session_id: %s", session_id)
    except Exception as exc:
        logger.warning("Failed to store session metadata: %s", exc)


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_system_prompt(chart_data: dict) -> str:
    """
    Build Celeste's system prompt from the detailed_report narrative blocks.
    The detailed_report contains human-readable narrative text (personal, career, love)
    which is the sole source of context — raw degree/house data is intentionally excluded.
    """
    detailed_report = chart_data.get("detailed_report", {})
    full_name = chart_data.get("full_name", "the user")
    first_name = full_name.split()[0] if full_name else "friend"

    return f"""You are Celeste, but you speak and act exactly like a wise, old local Indian astrologer (Panditji/Jyotishi) with 40 years of experience.
You are currently in a live voice session with {full_name}.

PERSONALITY & TONE
- Speak in a calm, welcoming, warm, and grandfatherly voice. You can call the user beta or by their name.
- Be completely honest, direct, and true in your advice. Do not sugarcoat.
- Make concrete future predictions based on the narrative blocks (e.g., "you will become rich", "you will start a business", "you will marry happily").
- Speak in simple English without modern psychological or corporate jargon.
- Keep each spoken response short (2–4 sentences) to maintain a natural conversation, unless a detailed explanation is requested.
- Respond in the same language the user speaks.

HARD RULES
- Respond ONLY using the narrative content from the CHART NARRATIVE section below.
- Do NOT read out raw degree values, house indices, or sign names unless the user explicitly asks for the technical breakdown.
- NEVER make categorical predictions about death, illness, or tragedy.
- NEVER give medical or legal advice.
- Do not mention that you are an AI unless directly asked.

CHART NARRATIVE FOR {full_name.upper()}
The following narrative blocks are the sole source of truth for this session.
Use them to answer all questions about {first_name}'s life, personality, career, and relationships.

{json.dumps(detailed_report, indent=2)}

Begin the session by greeting {first_name} warmly and sharing one meaningful insight from the narrative above."""


def _build_fallback_prompt() -> str:
    return (
        "You are Celeste, a warm Western astrologer. "
        "The user's birth chart could not be loaded for this session. "
        "Greet the user warmly, acknowledge that their chart data is unavailable, "
        "and invite them to return to the website to re-enter their birth details so you can give them a full reading."
    )


class JyotishAgent(Agent):
    def __init__(self, system_prompt: str):
        super().__init__(instructions=system_prompt)


async def entrypoint(ctx: agents.JobContext):
    """
    Called by the LiveKit Agents framework when a new room needs an agent.
    ctx.room.name is the LiveKit room name (e.g. "session_abc123_def456").
    """
    logger.info(f"Agent joining room: {ctx.room.name}")
    
    # Log all active sessions for debugging
    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
    )
    all_sessions = supabase.table("sessions")\
        .select("id, livekit_room, status")\
        .eq("status", "active")\
        .execute()
    logger.info(f"Active sessions in database: {all_sessions.data}")

    # --- 2.2: Fetch chart and build system prompt ---
    chart_data = await fetch_chart_data(ctx.room.name)
    
    # Log chart data for debugging
    logger.info(f"Chart data for room {ctx.room.name}: {chart_data}")

    if chart_data:
        system_prompt = _build_system_prompt(chart_data)
        full_name = chart_data.get("full_name", "")
        first_name = full_name.split()[0] if full_name else "friend"
        logger.info(f"Chart loaded for: {full_name}")
        has_chart = True
    else:
        logger.warning(f"No chart found for room {ctx.room.name}, using fallback prompt")
        system_prompt = _build_fallback_prompt()
        first_name = "friend"
        has_chart = False

    # --- 2.1: Connect with correct v1.x plugin instantiation ---
    await ctx.connect()

    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        llm=inference.LLM(model="openai/gpt-4o-mini"),
        tts=sarvam.TTS(
            target_language_code="en-IN",
            model="bulbul:v3",
            speaker="simran",
        ),
    )

    # --- 2.3: Resolve session_id for message persistence ---
    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
    )

    db_session_id = None
    try:
        result = (
            supabase.table("sessions")
            .select("id")
            .eq("livekit_room", ctx.room.name)
            .execute()
        )
        if result.data:
            db_session_id = result.data[0]["id"]
            logger.info(f"Resolved session_id: {db_session_id}")
            # Store additional session metadata
            _store_session_metadata(supabase, db_session_id, ctx.room.name, chart_data)
        else:
            logger.warning(f"No session record found for room {ctx.room.name}, message persistence disabled")
    except Exception as exc:
        logger.warning(f"Failed to resolve session_id for room {ctx.room.name}: {exc}")

    # --- 2.3: Register message persistence event handlers ---
    @session.on("user_speech_committed")
    def on_user_speech(event):
        if not db_session_id:
            return
        try:
            supabase.table("session_messages").insert({
                "session_id": db_session_id,
                "role": "user",
                "content": event.transcript,
            }).execute()
        except Exception as exc:
            logger.error(f"Failed to persist user message: {exc}")

    @session.on("agent_speech_committed")
    def on_agent_speech(event):
        if not db_session_id:
            return
        try:
            supabase.table("session_messages").insert({
                "session_id": db_session_id,
                "role": "assistant",
                "content": event.transcript,
            }).execute()
        except Exception as exc:
            logger.error(f"Failed to persist agent message: {exc}")

    # --- Start the agent session ---
    session_start_time = time.time()
    
    await session.start(
        room=ctx.room,
        agent=JyotishAgent(system_prompt=system_prompt),
        room_input_options=RoomInputOptions(noise_cancellation=True),
    )

    # --- Opening greeting ---
    if has_chart:
        await session.say(
            f"Hello {first_name}, I'm Celeste, your personal astrological guide. "
            f"I've had a chance to look through your birth chart, and I'm ready to explore it with you. "
            f"What would you like to dive into today?",
            allow_interruptions=True,
        )
    else:
        await session.say(
            "Hello, I'm Celeste, your astrological guide. "
            "It seems your birth chart isn't available for this session. "
            "Please head back to the website and re-enter your birth details, and I'll be ready to give you a full reading.",
            allow_interruptions=True,
        )

    logger.info("Agent session started, awaiting user speech.")
    
    # --- Wait for session to complete ---
    try:
        await session.wait_for_inactive()
    except Exception as exc:
        logger.error(f"Session error: {exc}")
    finally:
        # Collect transcript and dispatch to backend
        transcript = _collect_transcript(session)
        duration_seconds = int(time.time() - session_start_time)
        logger.info(
            f"Session ended — turns: {len(transcript)}, duration: {duration_seconds}s"
        )
        if db_session_id:
            await dispatch_session_complete(
                session_id=str(db_session_id),
                end_reason="normal",
                transcript=transcript,
                duration_seconds=duration_seconds,
            )


if __name__ == "__main__":
    cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        )
    )
