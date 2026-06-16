# TASK: Specification-Driven Implementation of Phase 2 (OpenRouter Translation Engine)

You must strictly implement our AI astrology report generator using OpenRouter for 100% Western Tropical astrology interpretation. Completely overwrite the target files. Do not leave any placeholders or use `# TODO` tags.

## Target Files to Update/Overwrite:
1. `backend/app/services/chart_engine.py`
2. `backend/app/routers/chart.py`

---

## SECTION 1: SPECIFICATIONS FOR `backend/app/services/chart_engine.py`

Rewrite this file. Keep your existing `pyswisseph`, `geopy`, and `timezonefinder` calculations for longitudes, houses, and angles intact. 

However, discard all old Vedic calculations (nakshatras, dashas, yogas). Instead, add an asynchronous function called `generate_human_report` that aggregates the raw calculated metrics and sends them via an async `httpx` POST payload to OpenRouter using JSON mode.

### OpenRouter Execution Blueprint:
- **Base URL:** `https://openrouter.ai/api/v1/chat/completions`
- **Model:** `google/gemini-2.5-flash` or `openai/gpt-4o-mini` (fast and cost-effective for structured text processing)
- **Authentication Header:** `Authorization: Bearer <settings.OPENROUTER_API_KEY>` (Ensure this is grabbed from config.py/env)
- **Response Format Force:** Include `"response_format": {"type": "json_object"}` in the payload.

Implement the file completely matching this functional structure:

```python
import datetime
import httpx
import json
import swisseph as swe
from app.config import settings # Expecting settings.OPENROUTER_API_KEY
from app.models.schemas import RawAstrologyData, DetailedReport, TimelineReport

# Keep your existing core setup logic here for local coordinates, Placidus house calculation, and planetary degrees.
# ... [Local calculation utility methods go here] ...

async def generate_human_report(raw_data: dict) -> dict:
    """
    Takes raw astronomical metrics and sends them to OpenRouter 
    to obtain a highly relatable, conversational 3-tab past/present/future report.
    """
    if not settings.OPENROUTER_API_KEY:
        # Fallback dummy narrative if key is missing during boot tests
        return {
            "personal": {"past": "Your foundations are built on seeking absolute alignment.", "current": "You are experiencing an energetic transition.", "future": "Your inner confidence solidifies completely."},
            "career": {"past": "You have an innate blueprint to build tangible systems.", "current": "A spark of high-voltage innovation drives you now.", "future": "Long term stability locks in place."},
            "love": {"past": "You seek intellectual freedom and zero drama.", "current": "Quality auditing in your circle is ongoing.", "future": "Aligned strategic alliances bring massive growth."}
        }
        
    url = "[https://openrouter.ai/api/v1/chat/completions](https://openrouter.ai/api/v1/chat/completions)"
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "[https://jyotishai.com](https://jyotishai.com)",
        "X-Title": "JyotishAI Engine"
    }
    
    prompt = f"""
    You are a master of high-end psychological astrology. Interpret these raw Western Tropical positions:
    {json.dumps(raw_data, indent=2)}

    Translate these equations into completely human-relatable, conversational, and jargon-free life vibes. 
    DO NOT use astrology homework keywords in the text like 'Mars square Venus' or 'transiting my 9th house'. Speak directly about the person's real life, feelings, ambitions, and social patterns.

    You MUST return a JSON object with this exact architecture:
    {{
      "personal": {{ "past": "...", "current": "...", "future": "..." }},
      "career": {{ "past": "...", "current": "...", "future": "..." }},
      "love": {{ "past": "...", "current": "...", "future": "..." }}
    }}
    Ensure each value contains a robust, detailed narrative paragraph.
    """
    
    payload = {
        "model": "openai/gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.7
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                return json.loads(content)
            else:
                raise Exception(f"OpenRouter Error: {response.text}")
        except Exception as e:
            # Safe operational fallback object matching schema
            return {
                "personal": {"past": "Narrative baseline.", "current": "Narrative checkpoint.", "future": "Narrative growth outlook."},
                "career": {"past": "Narrative baseline.", "current": "Narrative checkpoint.", "future": "Narrative growth outlook."},
                "love": {"past": "Narrative baseline.", "current": "Narrative checkpoint.", "future": "Narrative growth outlook."}
            }


SECTION 2: SPECIFICATIONS FOR backend/app/routers/chart.py
Completely rewrite the POST /chart/compute endpoint. It must accept a ChartComputeRequest, trigger the local ephemeris calculations, pass that data structure to OpenRouter for the text generation, write the final resulting objects directly to Supabase via PostgREST, and return a validated ChartResponse payload matching our schema.


from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import ChartComputeRequest, ChartResponse, RawAstrologyData, DetailedReport
from app.db.supabase import get_supabase_client # Your database client singleton
from app.services.chart_engine import compute_raw_western_data, generate_human_report
import uuid

router = APIRouter(prefix="/chart", tags=["chart"])

@router.post("/compute", response_model=ChartResponse, status_code=status.HTTP_201_CREATED)
async def compute_chart(payload: ChartComputeRequest):
    # 1. Trigger the ephemeris binding math engine to fetch degrees/houses
    raw_astro = compute_raw_western_data(
        birth_date=payload.birth_date,
        birth_time=payload.birth_time,
        city=payload.birth_city
    )
    
    # 2. Fire async pipeline engine via OpenRouter for user-facing prose
    human_report = await generate_human_report(raw_astro)
    
    # 3. Construct payload for Supabase INSERT matching Phase 1 sql spec
    db_payload = {
        "user_id": str(payload.user_id),
        "full_name": payload.full_name,
        "birth_date": str(payload.birth_date),
        "birth_time": str(payload.birth_time),
        "birth_city": payload.birth_city,
        "latitude": raw_astro["angles"]["ascendant"]["lat"], # derived during geocoding
        "longitude": raw_astro["angles"]["ascendant"]["lon"],
        "timezone": raw_astro["angles"]["ascendant"]["tz"],
        "raw_astrology_data": raw_astro,
        "detailed_report": human_report,
        "is_primary": True
    }
    
    supabase = get_supabase_client()
    db_res = supabase.table("birth_charts").insert(db_payload).execute()
    
    if not db_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist newly computed birth chart inside database."
        )
        
    inserted_row = db_res.data[0]
    
    return ChartResponse(
        chart_id=uuid.UUID(inserted_row["id"]),
        full_name=inserted_row["full_name"],
        raw_astrology_data=RawAstrologyData(**inserted_row["raw_astrology_data"]),
        detailed_report=DetailedReport(**inserted_row["detailed_report"]),
        message="Chart computed successfully under Western Tropical framework."
    )