"""
LiveKit Voice Agent Worker — v1 SDK (livekit-agents >= 1.0)
Drives the AI mock interview voice pipeline.
"""
import asyncio
import json
import logging
import os
import time

# Load .env before anything else so all env vars are available to plugins and AgentServer
from dotenv import load_dotenv
load_dotenv()

from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    ChatContext,
    cli,
    inference,
)
from livekit.plugins import silero, sarvam

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Server + prewarm
# ---------------------------------------------------------------------------

server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_system_prompt(
    candidate_name: str,
    job_title: str,
    resume_summary: dict,
    questions: list,
    jd_summary: str,
) -> str:
    roadmap_lines = []
    for i, q in enumerate(questions[:8], start=1):
        text = q.get("question", "") if isinstance(q, dict) else str(q)
        roadmap_lines.append(f"{i}. {text}")
    for i in range(len(roadmap_lines) + 1, 9):
        roadmap_lines.append(f"{i}. (no question provided)")

    roadmap = "\n".join(roadmap_lines)

    return f"""You are Aria, a warm and professional AI interviewer conducting a mock practice interview.
Your goal is to help the candidate practise their responses in a realistic, supportive environment.

# Candidate Profile
- Name: {candidate_name}
- Target Role: {job_title}
- Background Summary: {resume_summary}
- Job Description Context: {jd_summary}

# Interview Roadmap
Ask the following questions in order. Do not skip or reorder them.
{roadmap}

# Rules
- Ask one question at a time and wait for the full response before continuing.
- You may ask one brief follow-up per answer to encourage elaboration, then move on.
- Keep your turns concise — you are the interviewer, not the interviewee.
- Maintain a warm, professional tone throughout.
- Do NOT use: spearheaded, honed, leveraged, cross-functional, robust, deep dive.
- When all questions are covered, thank the candidate warmly and close the session."""


# ---------------------------------------------------------------------------
# Transcript helper
# ---------------------------------------------------------------------------

def _collect_transcript(history: ChatContext) -> list:
    transcript = []
    try:
        for msg in history.messages():
            role = str(getattr(msg, "role", ""))
            if role in ("system", "developer"):
                continue
            speaker = "agent" if role == "assistant" else "candidate"
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
# Webhook dispatch
# ---------------------------------------------------------------------------

async def dispatch_session_complete(
    session_id: str,
    end_reason: str,
    transcript: list,
    duration_seconds: int = 0,
) -> None:
    import httpx
    from config import settings

    payload = {
        "session_id": session_id,
        "end_reason": end_reason,
        "duration_seconds": duration_seconds,
        "transcript": transcript,
    }
    url = f"{settings.BACKEND_URL}/api/v1/practice/session/complete"
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
# Session handler
# ---------------------------------------------------------------------------

@server.rtc_session(agent_name="practice-interview-agent")
async def interview_session(ctx: JobContext) -> None:
    """LiveKit agent entrypoint: connect, parse metadata, start interview pipeline."""
    from config import settings

    raw_metadata = ctx.job.room.metadata
    if not raw_metadata:
        logger.error("Missing room metadata — cannot start interview session.")
        return

    try:
        metadata = json.loads(raw_metadata)
    except json.JSONDecodeError as exc:
        logger.error("Malformed room metadata JSON: %s", exc)
        return

    await ctx.connect()
    logger.info("Connected to room: %s", ctx.room.name)

    candidate_name = metadata.get("candidate_name", "there")
    job_title      = metadata.get("job_title", "the role")
    resume_summary = metadata.get("resume_summary", {})
    questions      = metadata.get("questions", [])
    jd_summary     = metadata.get("jd_summary", "")
    session_id     = metadata.get("interview_id", "unknown")
    speaker        = metadata.get("agent_voice", "simran")

    logger.info("Session %s — candidate: %s, job: %s, questions: %d",
                session_id, candidate_name, job_title, len(questions))

    system_prompt = _build_system_prompt(
        candidate_name, job_title, resume_summary, questions, jd_summary
    )

    session_start_time = time.time()
    end_reason = "normal"

    agent = Agent(instructions=system_prompt)

    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        llm=inference.LLM(model="openai/gpt-4o-mini"),
        tts=sarvam.TTS(
            target_language_code="en-IN",
            model="bulbul:v3",
            speaker=speaker,
        ),
    )

    try:
        await session.start(agent, room=ctx.room)
        logger.info("Session started for %s", session_id)

        first_name = candidate_name.split()[0] if candidate_name else "there"
        await session.say(
            f"Hey {first_name}, good to have you here. "
            f"I'm Aria — I'll be running your mock interview for the {job_title} role today. "
            "I've had a look at your background so we can get straight into it. "
            "Whenever you're ready, let's begin."
        )
        logger.info("Opening greeting sent for %s", session_id)

        await session.wait_for_inactive()

    except Exception as exc:
        logger.error("Session error for %s: %s", session_id, exc, exc_info=True)
        end_reason = "normal"
    finally:
        transcript = _collect_transcript(session.history)
        duration_seconds = int(time.time() - session_start_time)
        logger.info("Session %s ended — reason: %s, turns: %d, duration: %ds",
                    session_id, end_reason, len(transcript), duration_seconds)
        await dispatch_session_complete(session_id, end_reason, transcript, duration_seconds)


# ---------------------------------------------------------------------------
# Worker bootstrap
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    cli.run_app(server)
