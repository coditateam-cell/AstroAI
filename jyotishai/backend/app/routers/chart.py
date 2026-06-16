from fastapi import APIRouter, HTTPException

from app.models.schemas import ChartComputeRequest, ChartResponse
from app.services.chart_engine import compute_raw_western_data, generate_human_report
from app.db.supabase import get_supabase_client

router = APIRouter()


@router.post("/compute", response_model=ChartResponse, status_code=201)
async def compute_chart(req: ChartComputeRequest):
    # 1. Compute raw Western Tropical chart (geocoding + ephemeris)
    try:
        raw_astro = compute_raw_western_data(req.birth_date, req.birth_time, req.birth_city)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chart computation failed: {str(e)}")

    # 2. Extract geocoding metadata embedded by compute_raw_western_data
    meta = raw_astro["_meta"]
    latitude = meta["latitude"]
    longitude = meta["longitude"]
    timezone = meta["timezone"]

    # 3. Generate conversational AI report via OpenRouter
    detailed_report = await generate_human_report(raw_astro)

    # 4. Strip _meta before persisting — it is not part of RawAstrologyData schema
    raw_astro_clean = {k: v for k, v in raw_astro.items() if k != "_meta"}

    # 5. Persist to Supabase
    db_payload = {
        "user_id": str(req.user_id),
        "full_name": req.full_name,
        "birth_date": str(req.birth_date),
        "birth_time": str(req.birth_time),
        "birth_city": req.birth_city,
        "latitude": latitude,
        "longitude": longitude,
        "timezone": timezone,
        "raw_astrology_data": raw_astro_clean,
        "detailed_report": detailed_report,
        "is_primary": True,
    }

    db_res = get_supabase_client().table("birth_charts").insert(db_payload).execute()

    if not db_res.data:
        raise HTTPException(status_code=500, detail="Failed to persist chart: no data returned from database")

    row = db_res.data[0]

    return ChartResponse(
        chart_id=row["id"],
        full_name=row["full_name"],
        raw_astrology_data=row["raw_astrology_data"],
        detailed_report=row["detailed_report"],
        message=f"Chart computed successfully for {row['full_name']}",
    )


@router.get("/user/{user_id}")
def get_user_charts(user_id: str):
    result = get_supabase_client().table("birth_charts").select("*").eq("user_id", user_id).execute()
    return {"charts": result.data}


@router.get("/{chart_id}")
def get_chart(chart_id: str):
    result = get_supabase_client().table("birth_charts").select("*").eq("id", chart_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Chart not found")
    return result.data[0]
