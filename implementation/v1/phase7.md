# Phase 07 — LiveKit AI Voice Agent (Claude + Deepgram + ElevenLabs)

## Goal
Build the LiveKit Python agent that joins every session room, listens to the user via Deepgram STT, sends their speech + the full birth chart context to Claude, and streams the response back as audio via ElevenLabs TTS. By end of this phase the app is fully functional — a user can have a real voice conversation with an AI Vedic astrologer that knows their exact chart.

---

## Architecture of the Agent

```
User mic (browser)
  → LiveKit WebRTC
    → Deepgram STT (transcription)
      → Agent receives text
        → Builds prompt: System (astrologer persona + chart data) + conversation history + user message
          → Claude claude-sonnet-4-20250514 (streaming response)
            → ElevenLabs TTS (audio synthesis)
              → LiveKit WebRTC
                → User speaker (browser)
```

The agent runs as a **separate Python process** — it listens for new LiveKit rooms and auto-joins them.

---

## Step 1 — Install Agent Dependencies

```bash
cd agent
source venv/bin/activate

pip install \
  "livekit-agents[anthropic,deepgram,elevenlabs,silero]>=0.12" \
  livekit-plugins-anthropic \
  livekit-plugins-deepgram \
  livekit-plugins-elevenlabs \
  livekit-plugins-silero \
  httpx \
  python-dotenv

pip freeze > requirements.txt
```

> `silero` is the Voice Activity Detection (VAD) plugin — it detects when the user stops speaking so the agent knows when to respond.

---

## Step 2 — Chart Fetcher

The agent needs to fetch the birth chart from your FastAPI backend when it joins a room.

### `agent/chart_client.py`

```python
import httpx
import os
from typing import Optional

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
BACKEND_SECRET = os.getenv("BACKEND_AGENT_SECRET")  # shared secret for agent→backend calls


async def fetch_chart_for_room(room_name: str) -> Optional[dict]:
    """
    Given a LiveKit room name, fetch the associated birth chart from the backend.
    The backend looks up the session by room name, then returns the linked chart.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BACKEND_URL}/agent/chart-for-room",
            params={"room": room_name},
            headers={"X-Agent-Secret": BACKEND_SECRET},
            timeout=10.0
        )
        if resp.status_code == 200:
            return resp.json()
        return None


def build_chart_context(chart: dict) -> str:
    """
    Convert the raw chart JSON into a readable block the LLM can use.
    Structured text is easier for Claude to reason over than raw JSON.
    """
    planets = chart.get("planets", {})

    planet_lines = []
    for name, data in planets.items():
        retro = " (retrograde)" if data.get("retrograde") else ""
        planet_lines.append(
            f"  - {name.capitalize()}: {data['sign']} at {data['degree']:.1f}°{retro}"
        )

    mahadasha = chart.get("mahadasha", {})
    current_dasha = mahadasha.get("current", {})
    upcoming_dashas = mahadasha.get("all", [])[:4]  # next 4 periods

    upcoming_lines = []
    for d in upcoming_dashas:
        start_year = d["start"][:4]
        end_year = d["end"][:4]
        upcoming_lines.append(f"  - {d['lord']} Mahadasha: {start_year}–{end_year}")

    yogas = chart.get("yogas", [])
    yoga_lines = [f"  - {y['name']}: {y['description']}" for y in yogas] if yogas else ["  - None detected"]

    return f"""
BIRTH CHART DATA
================
Name: {chart.get('full_name', 'the native')}
Ascendant (Lagna): {chart.get('ascendant', 'Unknown')}
Sun Sign (Surya Rashi): {chart.get('sun_sign', 'Unknown')}
Moon Sign (Chandra Rashi): {chart.get('moon_sign', 'Unknown')}
Birth Nakshatra: {chart.get('nakshatra', 'Unknown')}, Pada {chart.get('nakshatra_pada', '?')}
Nakshatra Lord: {chart.get('nakshatra_lord', 'Unknown')}

PLANETARY POSITIONS (Sidereal / Lahiri Ayanamsa)
{chr(10).join(planet_lines)}

VIMSHOTTARI DASHA PERIODS
Current: {current_dasha.get('lord', '?')} Mahadasha (ends {current_dasha.get('end', '?')[:10]})
Upcoming:
{chr(10).join(upcoming_lines)}

YOGAS
{chr(10).join(yoga_lines)}
""".strip()
```

---

## Step 3 — Backend Endpoint for Agent Chart Lookup

Add this to `backend/app/routers/` — create a new file:

### `backend/app/routers/agent.py`

```python
from fastapi import APIRouter, HTTPException, Header
from app.db.supabase import supabase
from app.config import settings

router = APIRouter()

def verify_agent_secret(x_agent_secret: str = Header(None)):
    if x_agent_secret != settings.backend_agent_secret:
        raise HTTPException(status_code=403, detail="Invalid agent secret")

@router.get("/chart-for-room")
def chart_for_room(room: str, _=Depends(verify_agent_secret)):
    """
    Internal endpoint: given a LiveKit room name, return the associated birth chart.
    Only callable by the agent (verified via shared secret).
    """
    # Find the session for this room
    session_result = supabase.table("sessions")\
        .select("birth_chart_id")\
        .eq("livekit_room", room)\
        .eq("status", "active")\
        .execute()

    if not session_result.data:
        raise HTTPException(status_code=404, detail="No active session for this room")

    chart_id = session_result.data[0]["birth_chart_id"]

    chart_result = supabase.table("birth_charts")\
        .select("*")\
        .eq("id", chart_id)\
        .execute()

    if not chart_result.data:
        raise HTTPException(status_code=404, detail="Chart not found")

    return chart_result.data[0]
```

Register in `backend/app/main.py`:

```python
from app.routers import agent
app.include_router(agent.router, prefix="/agent", tags=["agent"])
```

Add to `backend/.env` and `backend/app/config.py`:

```env
BACKEND_AGENT_SECRET=some_random_secret_string_here
```

```python
# config.py
backend_agent_secret: str
```

Also add to `agent/.env`:

```env
BACKEND_URL=http://localhost:8000
BACKEND_AGENT_SECRET=some_random_secret_string_here
```

---

## Step 4 — System Prompt Builder

### `agent/prompts.py`

```python
SYSTEM_PROMPT_TEMPLATE = """
You are Pandit Jyotish, a wise, warm, and deeply knowledgeable Vedic astrologer with 40 years of experience reading birth charts. You have studied under the Parashara tradition and are fluent in both Vedic and Western astrology, though you prefer the Vedic system.

PERSONALITY
- Speak in a calm, measured, reassuring voice — like a trusted elder
- Use Sanskrit terms naturally but always explain them (e.g. "your Lagna, or ascendant")
- Be specific: always reference actual planetary positions from the chart
- Be empathetic: people come to you with real concerns about love, money, family, and health
- Be honest: do not make categorical predictions. Speak in probabilities and tendencies ("this period tends to bring...", "your chart indicates a strong inclination toward...")
- Keep responses conversational and moderately concise — you are speaking, not writing an essay
- Occasionally use phrases like "the stars suggest...", "according to your Kundli...", "Shani (Saturn) in your chart..."

HARD RULES
- NEVER make predictions about death, serious illness, or tragedy
- NEVER make guarantees ("you WILL get married in 2025") — always say "strongly indicates", "suggests", "tends to"
- NEVER give medical or legal advice — redirect to professionals for those
- If you don't know something, say "the chart doesn't give me a clear signal on that" rather than making something up
- Do not mention that you are an AI unless directly asked

CHART DATA
The following is {name}'s actual computed birth chart. Use this data for every response.

{chart_context}

CONVERSATION STYLE
- Respond in the same language the user speaks (Hindi or English)
- Keep each spoken response to 2–4 sentences unless a detailed explanation is requested
- If the user asks a vague question, gently ask for clarification ("Are you asking about career or relationships?")
- Begin the session with a brief welcome that mentions 1–2 notable things from their chart
""".strip()


def build_system_prompt(chart: dict, chart_context: str) -> str:
    name = chart.get("full_name", "the native")
    return SYSTEM_PROMPT_TEMPLATE.format(
        name=name,
        chart_context=chart_context
    )
```

---

## Step 5 — Main Agent

### `agent/main.py`

```python
import asyncio
import logging
import os
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import anthropic, deepgram, elevenlabs, silero

from chart_client import fetch_chart_for_room, build_chart_context
from prompts import build_system_prompt

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jyotishai-agent")


class JyotishAgent(Agent):
    def __init__(self, system_prompt: str):
        super().__init__(instructions=system_prompt)


async def entrypoint(ctx: agents.JobContext):
    """
    Called by LiveKit Agents framework when a new room needs an agent.
    ctx.room.name is the LiveKit room name (e.g. "session_abc123_def456")
    """
    logger.info(f"Agent joining room: {ctx.room.name}")

    # 1. Fetch the birth chart for this room
    chart = await fetch_chart_for_room(ctx.room.name)

    if not chart:
        logger.warning(f"No chart found for room {ctx.room.name}, using generic prompt")
        system_prompt = (
            "You are Pandit Jyotish, a Vedic astrologer. The user's birth chart was not loaded. "
            "Apologise and ask them to go back and re-enter their birth details."
        )
    else:
        chart_context = build_chart_context(chart)
        system_prompt = build_system_prompt(chart, chart_context)
        logger.info(f"Chart loaded for: {chart.get('full_name')}")

    # 2. Connect to the room
    await ctx.connect()

    # 3. Build the agent session with STT → LLM → TTS pipeline
    session = AgentSession(
        stt=deepgram.STT(
            model="nova-2",
            language="en-IN",        # Indian English — better accent handling
            interim_results=True,    # Show partial transcription
        ),
        llm=anthropic.LLM(
            model="claude-sonnet-4-20250514",
            api_key=os.getenv("ANTHROPIC_API_KEY"),
        ),
        tts=elevenlabs.TTS(
            voice_id="pNInz6obpgDQGcFmaJgB",   # "Adam" — calm, warm male voice
            model_id="eleven_turbo_v2_5",        # Lowest latency model
            api_key=os.getenv("ELEVENLABS_API_KEY"),
        ),
        vad=silero.VAD.load(),   # Voice activity detection
    )

    # 4. Start the agent
    await session.start(
        room=ctx.room,
        agent=JyotishAgent(system_prompt=system_prompt),
        room_input_options=RoomInputOptions(
            noise_cancellation=True,
        ),
    )

    # 5. Opening greeting — agent speaks first
    name = chart.get("full_name", "").split()[0] if chart else "friend"  # first name only
    await session.say(
        f"Namaste {name}. I am Pandit Jyotish. I have studied your Kundli carefully. "
        f"Your {chart.get('ascendant', 'ascendant')} lagna gives you a strong and perceptive nature, "
        f"and with your Moon in {chart.get('moon_sign', 'its sign')}, you carry deep emotional wisdom. "
        f"What would you like to explore today — career, relationships, health, or your current dasha period?",
        allow_interruptions=True
    )

    logger.info("Agent session started, awaiting user speech.")


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(entrypoint_fnc=entrypoint)
    )
```

---

## Step 6 — Run the Agent

```bash
cd agent
source venv/bin/activate

# Development mode: auto-reloads on file changes
python main.py dev

# Production mode:
python main.py start
```

You should see:
```
INFO Starting agent worker...
INFO Connected to LiveKit server
INFO Waiting for jobs...
```

When a user joins a session from the frontend, LiveKit dispatches a job to the agent worker. You'll then see:
```
INFO Agent joining room: session_abc123_def456
INFO Chart loaded for: Arjun Mehta
INFO Agent session started, awaiting user speech.
```

---

## Step 7 — Save Transcript to Supabase

Listen to agent events and persist messages.

Add to `agent/main.py` inside `entrypoint`, after `session.start()`:

```python
    # Save messages to Supabase as they happen
    from supabase import create_client
    import os

    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )

    # Get session ID from room metadata or name
    session_result = supabase.table("sessions")\
        .select("id")\
        .eq("livekit_room", ctx.room.name)\
        .execute()

    db_session_id = session_result.data[0]["id"] if session_result.data else None

    @session.on("user_speech_committed")
    def on_user_speech(event):
        if db_session_id:
            supabase.table("session_messages").insert({
                "session_id": db_session_id,
                "role": "user",
                "content": event.transcript
            }).execute()

    @session.on("agent_speech_committed")
    def on_agent_speech(event):
        if db_session_id:
            supabase.table("session_messages").insert({
                "session_id": db_session_id,
                "role": "assistant",
                "content": event.transcript
            }).execute()
```

Add to `agent/.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Step 8 — Wire Transcript to Frontend

In `frontend/components/SessionUI.tsx`, subscribe to LiveKit data messages to receive the transcript in real-time:

```tsx
import { useDataChannel } from '@livekit/components-react'

// Inside SessionUI component:
const { message } = useDataChannel('transcript')

useEffect(() => {
  if (message?.payload) {
    const data = JSON.parse(new TextDecoder().decode(message.payload))
    setMessages(prev => [...prev, {
      role: data.role,
      content: data.content,
      timestamp: new Date()
    }])
  }
}, [message])
```

---

## ✅ Phase 07 Checklist

- [ ] `python main.py dev` starts the agent worker with no errors
- [ ] Agent connects to LiveKit Cloud (check LiveKit dashboard → Rooms)
- [ ] When a user joins a session on the frontend, the agent auto-joins the same room
- [ ] Agent fetches the correct birth chart from backend (`/agent/chart-for-room`)
- [ ] Agent speaks the opening greeting with the user's actual chart data
- [ ] User can speak and get a response (full STT → LLM → TTS loop)
- [ ] Response references real planetary positions (not generic)
- [ ] Transcript messages saved to `session_messages` table in Supabase
- [ ] Mute button silences the user mic (agent goes back to idle)
- [ ] Hindi or English switching works (test by speaking in Hindi)
- [ ] Agent does NOT make death/illness predictions (test this manually)

## What's NOT built yet
- No usage limiting / paywall (Phase 08)
- No session summary generation (Phase 09)
- No PDF Kundli export or monetisation (Phase 09–10)