SECTION 2: PYDANTIC DATA MODELS (backend/app/models/schemas.py)
Completely rewrite this file to implement strict Pydantic v2 validation. You must define all sub-models fully to handle nested JSON parsing without throwing validation errors.

import datetime
import uuid
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

# --- DETAILED REPORT SUB-MODELS (Human Narrative) ---
class TimelineReport(BaseModel):
    past: str
    current: str
    future: str

class DetailedReport(BaseModel):
    personal: TimelineReport
    career: TimelineReport
    love: TimelineReport

# --- RAW ASTROLOGY DATA SUB-MODELS (Vibe Layout Data) ---
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
    houses: Dict[str, HouseDetails] = Field(..., description="Map of 12 house cusps keys '1' through '12'")
    angles: Dict[str, AngleDetails] = Field(..., description="Map containing 'ascendant' and 'midheaven'")

# --- SESSION ASSESSMENT SUB-MODEL ---
class SessionAssessment(BaseModel):
    session_summary: str
    key_insights: List[str]
    action_items: List[str]

# --- REQUEST / RESPONSE BODY SCHEMAS ---
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