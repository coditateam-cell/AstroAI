# TASK: Specification-Driven Implementation of Phase 4 (LiveKit Voice Agent & Post-Chat Summary)

You must completely update the LiveKit voice agent script. Repair the broken library imports, update the persona to track our human dashboard text blocks, and add an automated session assessment generator that triggers when a room finishes.

## Target Files to Update/Overwrite:
1. `agent/main.py`
2. `backend/app/routers/token.py` (or your webhook/session closure route handler)

---

## SECTION 1: SPECIFICATIONS FOR `agent/main.py`

Completely overwrite this file to ensure the pipeline runs cleanly via the official `livekit.agents` framework. Discard broken references like `inference.STT` or `sarvam.TTS`. Route text summaries through OpenRouter.

Implement `agent/main.py` exactly as follows:

```python
import os
import json
import logging
import httpx
from livekit.agents import JobContext, WorkerOptions, worker, llm
from livekit.plugins import openai, deepgram, elevenlabs, silero
from chart_client import fetch_chart_data # Resolves room name to chart data

logger = logging.getLogger("astrology-agent")

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to LiveKit Room: {ctx.room.name}")
    
    # 1. Fetch the unified chart data containing our custom detailed_report
    try:
        chart_data = await fetch_chart_data(ctx.room.name)
    except Exception as e:
        logger.error(f"Failed to pull chart context for room: {e}")
        chart_data = {}

    user_name = chart_data.get("full_name", "Seeker")
    narrative = chart_data.get("detailed_report", {})

    # 2. Build the System Prompt focusing strictly on the Human Narrative Blocks
    system_prompt = f"""
    You are Celeste, a warm, highly empathetic astrologer with 40 years of experience.
    You are in a live voice consultation with {user_name}.
    
    The user is currently looking at their dashboard tabs. Here is the exact conversational text they see:
    {json.dumps(narrative, indent=2)}
    
    CRITICAL RULES:
    - You must sound like a wise, compassionate human mentor. 
    - Base your insights directly on the dashboard text above. If they ask about career, look at the career.current or career.future strings.
    - NEVER read out technical astrology jargon, degrees, house indices, or raw coordinates unless they explicitly ask for the structural breakdown.
    - Keep responses brief, organic, and conversational (1-3 sentences max per turn) so it feels like a real phone call.
    - Strictly no medical, legal, or death predictions.
    """

    await ctx.connect()
    
    # 3. Initialize fully qualified plugins (fixing old snapshot bugs)
    llm_plugin = openai.LLM(model="openai/gpt-4o-mini", system_prompt=system_prompt)
    stt_plugin = deepgram.STT(model="nova-2-general")
    tts_plugin = elevenlabs.TTS(voice_id="EXAVITQu4vr4xnSDxMaL") # Premium warm voice profile
    vad_plugin = silero.VAD.load()

    # 4. Construct Voice Pipeline
    agent = llm.VoicePipelineAgent(
        vad=vad_plugin,
        stt=stt_plugin,
        llm=llm_plugin,
        tts=tts_plugin,
        chat_ctx=llm.ChatContext()
    )

    # 5. Wire database message log hooks
    @agent.on("user_speech_committed")
    def on_user_speech(msg: llm.ChatMessage):
        # Fire async task or helper to insert msg.content into public.session_messages (role='user')
        pass

    @agent.on("agent_speech_committed")
    def on_agent_speech(msg: llm.ChatMessage):
        # Fire async task or helper to insert msg.content into public.session_messages (role='assistant')
        pass

    # Start room performance
    agent.start(ctx.room)
    
    # Elegant opening greeting
    await agent.say(
        f"Hello {user_name}. I have cast your sky charts and see a fascinating alignment. What part of your cosmic blueprint shall we explore together today?",
        allow_interruptions=True
    )

if __name__ == "__main__":
    worker.run_app(WorkerOptions(entrypoint_fnc=entrypoint))

SECTION 2: SPECIFICATIONS FOR POST-CHAT ASSESSMENT GENERATION
When a LiveKit session concludes, the backend receives a room_finished event via POST /token/webhook. Update this route handler to compile the entire transcript from public.session_messages, send it to OpenRouter, and update the assessment JSONB column inside public.sessions.

Add this processing function to your backend routers or a standalone service and call it directly inside your webhook lifecycle:


import httpx
import json
from app.config import settings
from app.db.supabase import get_supabase_client

async def generate_post_session_assessment(session_id: str):
    supabase = get_supabase_client()
    
    # 1. Fetch transcript from db
    msg_res = supabase.table("session_messages").select("role, content").eq("session_id", session_id).order("created_at").execute()
    if not msg_res.data:
        return
        
    transcript_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in msg_res.data])
    
    # 2. Call OpenRouter to summarize into our Phase 1 SessionAssessment structure
    url = "[https://openrouter.ai/api/v1/chat/completions](https://openrouter.ai/api/v1/chat/completions)"
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""
    Analyze the following conversation transcript between a user and Celeste, an AI Astrologer:
    
    {transcript_text}
    
    Create a high-value, professional summary and action item map for the user's archives.
    You MUST return a JSON object with this exact architecture:
    {{
      "session_summary": "A cohesive, deeply personal paragraph summarizing their concerns, mental state, and Celeste's guidance.",
      "key_insights": ["Insight point 1", "Insight point 2", "Insight point 3"],
      "action_items": ["Practical task or perspective shift 1", "Practical task 2"]
    }}
    """
    
    payload = {
        "model": "openai/gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"}
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.post(url, headers=headers, json=payload, timeout=30.0)
        if res.status_code == 200:
            assessment_json = json.loads(res.json()["choices"][0]["message"]["content"])
            
            # 3. Update the session table with the structured evaluation block
            supabase.table("sessions").update({"assessment": assessment_json}).eq("id", session_id).execute()