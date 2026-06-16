import datetime
import uuid
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# JSONB sub-models — mirror the raw_astrology_data, detailed_report,
# and assessment column structures defined in supabase-schema.sql
# ---------------------------------------------------------------------------

class PlanetDetails(BaseModel):
    sign: str
    degree: float
    house: int
    is_retrograde: bool


class HouseDetails(BaseModel):
    sign: str
    degree: float


class AngleDetails(BaseModel):
    sign: str
    degree: float


class RawAstrologyData(BaseModel):
    planets: Dict[str, PlanetDetails] = Field(..., description="Map of planetary configurations (sun, moon, etc.)")
    houses: Dict[str, HouseDetails] = Field(..., description="Map of 12 house cusps, keys '1' through '12'")
    angles: Dict[str, AngleDetails] = Field(..., description="Map containing 'ascendant' and 'midheaven'")


class Timeframes(BaseModel):
    past: str
    present: str
    future: str


class HustleTab(BaseModel):
    your_natural_style: str
    the_biggest_block: str
    how_to_fix_it: str


class MoneyTab(BaseModel):
    your_financial_mindset: str
    the_money_trap: str
    cash_advice: str


class GrowthTab(BaseModel):
    public_mask: str
    private_reality: str
    mental_reset: str


class LoveTab(BaseModel):
    what_you_actually_crave: str
    the_romantic_fear: str
    heart_advice: str


class DetailedReport(BaseModel):
    age: Optional[int] = None
    timeframes: Optional[Timeframes] = None
    hustle_tab: HustleTab
    money_tab: MoneyTab
    growth_tab: GrowthTab
    love_tab: LoveTab



class SessionAssessment(BaseModel):
    session_summary: str
    key_insights: List[str]
    action_items: List[str]


# ---------------------------------------------------------------------------
# Top-level request / response models for FastAPI routes
# ---------------------------------------------------------------------------

class ChartComputeRequest(BaseModel):
    full_name: str
    birth_date: datetime.date
    birth_time: datetime.time
    birth_city: str
    gender: str
    user_id: uuid.UUID


class ChartResponse(BaseModel):
    chart_id: uuid.UUID
    full_name: str
    raw_astrology_data: RawAstrologyData
    detailed_report: DetailedReport
    message: str


class TokenGenerateRequest(BaseModel):
    chart_id: uuid.UUID


class TokenResponse(BaseModel):
    token: str
    room_name: str
    session_id: uuid.UUID
    livekit_url: str


class SessionCompleteRequest(BaseModel):
    session_id: str
    end_reason: str
    transcript: List[Dict[str, str]]
    duration_seconds: int = 0
