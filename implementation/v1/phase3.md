# Phase 03 — Birth Chart Computation Engine

## Goal
Build the core astrology engine. Takes birth name, date, time, and city → computes a complete Vedic birth chart (planets, houses, ascendant, nakshatra, dasha periods, basic yogas) and stores it in Supabase. This is the most technically critical phase — everything the AI says is based on this data.

---

## Dependencies to Install

```bash
cd backend
source venv/bin/activate

pip install pyswisseph geopy timezonefinder python-dateutil
pip freeze > requirements.txt
```

- `pyswisseph` — Python binding for Swiss Ephemeris (the gold standard ephemeris used by professional astrology software)
- `geopy` — Geocoding: city name → lat/lon
- `timezonefinder` — lat/lon → timezone string
- `python-dateutil` — reliable date/time parsing

---

## Step 1 — Swiss Ephemeris Data Files

Swiss Ephemeris needs planetary data files to compute accurate positions.

```bash
# Create ephemeris data directory
mkdir -p backend/ephe

# Download the core data files (covers 1800–2400 AD)
# These are free files from Astrodienst
cd backend/ephe
wget https://www.astro.com/ftp/swisseph/ephe/seas_18.se1
wget https://www.astro.com/ftp/swisseph/ephe/semo_18.se1
wget https://www.astro.com/ftp/swisseph/ephe/sepl_18.se1
```

If `wget` is unavailable, download manually from `https://www.astro.com/ftp/swisseph/ephe/` and place the `.se1` files in `backend/ephe/`.

---

## Step 2 — Geocoding Service

### `backend/app/services/geocoding.py`

```python
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder
from typing import Tuple

geolocator = Nominatim(user_agent="jyotishai/1.0")
tf = TimezoneFinder()

def geocode_city(city: str) -> Tuple[float, float, str]:
    """
    Convert a city name to (latitude, longitude, timezone).
    
    Returns:
        Tuple of (lat, lon, timezone_str)
        e.g. (19.076090, 72.877426, "Asia/Kolkata")
    
    Raises:
        ValueError if city is not found
    """
    location = geolocator.geocode(city, exactly_one=True, timeout=10)
    
    if not location:
        raise ValueError(f"Could not geocode city: '{city}'. Try a more specific name.")
    
    lat = location.latitude
    lon = location.longitude
    tz = tf.timezone_at(lat=lat, lng=lon)
    
    if not tz:
        raise ValueError(f"Could not determine timezone for coordinates ({lat}, {lon})")
    
    return lat, lon, tz
```

---

## Step 3 — Chart Computation Engine

### `backend/app/services/chart_engine.py`

```python
import swisseph as swe
import os
from datetime import datetime, date, time as time_type
import pytz
from typing import Any

# Point pyswisseph to the downloaded ephemeris files
EPHE_PATH = os.path.join(os.path.dirname(__file__), "../../ephe")
swe.set_ephe_path(EPHE_PATH)

# --- Vedic planet names and Swiss Ephemeris IDs ---
PLANETS = {
    "sun":     swe.SUN,
    "moon":    swe.MOON,
    "mars":    swe.MARS,
    "mercury": swe.MERCURY,
    "jupiter": swe.JUPITER,
    "venus":   swe.VENUS,
    "saturn":  swe.SATURN,
    "rahu":    swe.MEAN_NODE,   # North Node (mean)
}

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

NAKSHATRA_LORDS = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu",
    "Jupiter", "Saturn", "Mercury", "Ketu", "Venus", "Sun",
    "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu",
    "Jupiter", "Saturn", "Mercury"
]

# Vimshottari Dasha periods in years
DASHA_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7,
    "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17
}

def _sign_from_longitude(lon: float) -> dict:
    sign_index = int(lon / 30)
    degree_in_sign = lon % 30
    return {
        "sign": SIGNS[sign_index],
        "sign_index": sign_index,
        "degree": round(degree_in_sign, 4),
        "longitude": round(lon, 4)
    }

def _nakshatra_from_moon_lon(moon_lon: float) -> dict:
    nakshatra_index = int(moon_lon / (360 / 27))
    pada = int((moon_lon % (360 / 27)) / (360 / 108)) + 1
    return {
        "name": NAKSHATRAS[nakshatra_index],
        "pada": pada,
        "lord": NAKSHATRA_LORDS[nakshatra_index]
    }

def _compute_vimshottari_dasha(moon_lon: float, birth_dt: datetime) -> list[dict]:
    """Compute Vimshottari Dasha periods from Moon's nakshatra."""
    nakshatra_index = int(moon_lon / (360 / 27))
    lord = NAKSHATRA_LORDS[nakshatra_index]
    
    # Fraction of current nakshatra elapsed (how far through current dasha)
    nakshatra_span = 360 / 27
    degrees_into_nak = moon_lon % nakshatra_span
    fraction_elapsed = degrees_into_nak / nakshatra_span
    
    # Time remaining in first dasha
    first_dasha_years = DASHA_YEARS[lord]
    years_elapsed = fraction_elapsed * first_dasha_years
    years_remaining = first_dasha_years - years_elapsed
    
    dashas = []
    lords_order = list(DASHA_YEARS.keys())
    start_index = lords_order.index(lord)
    
    current_dt = birth_dt
    
    for i in range(9):  # 9 dashas = full 120 year cycle
        idx = (start_index + i) % 9
        current_lord = lords_order[idx]
        years = DASHA_YEARS[current_lord] if i > 0 else years_remaining
        
        end_dt = current_dt.replace(
            year=current_dt.year + int(years),
            month=current_dt.month
        )
        
        dashas.append({
            "lord": current_lord,
            "start": current_dt.isoformat(),
            "end": end_dt.isoformat(),
            "years": round(years, 2)
        })
        
        current_dt = end_dt
    
    return dashas

def _find_current_dasha(dashas: list[dict]) -> dict:
    now = datetime.now().isoformat()
    for d in dashas:
        if d["start"] <= now <= d["end"]:
            return d
    return dashas[0]

def _detect_basic_yogas(planets: dict) -> list[dict]:
    """Detect a subset of common Vedic yogas."""
    yogas = []
    
    sun = planets.get("sun", {})
    moon = planets.get("moon", {})
    jupiter = planets.get("jupiter", {})
    
    # Gajakesari Yoga: Jupiter in kendra (1,4,7,10) from Moon
    if moon and jupiter:
        diff = abs(moon["sign_index"] - jupiter["sign_index"])
        if diff in [0, 3, 6, 9]:
            yogas.append({
                "name": "Gajakesari Yoga",
                "description": "Jupiter in kendra from Moon — indicates wisdom, wealth, and good reputation.",
                "planets": ["Jupiter", "Moon"]
            })
    
    # Budha-Aditya Yoga: Sun and Mercury in same sign
    mercury = planets.get("mercury", {})
    if sun and mercury and sun["sign_index"] == mercury["sign_index"]:
        yogas.append({
            "name": "Budha-Aditya Yoga",
            "description": "Sun and Mercury conjunct — sharp intellect, communication skills, and recognition.",
            "planets": ["Sun", "Mercury"]
        })
    
    return yogas

def compute_birth_chart(
    birth_date: date,
    birth_time: time_type,
    latitude: float,
    longitude: float,
    timezone: str
) -> dict[str, Any]:
    """
    Main computation function. Returns a complete Vedic birth chart as a dict.
    """
    # Convert local birth time → UTC Julian Day (required by Swiss Ephemeris)
    tz = pytz.timezone(timezone)
    local_dt = datetime.combine(birth_date, birth_time)
    local_dt = tz.localize(local_dt)
    utc_dt = local_dt.astimezone(pytz.utc)
    
    jd = swe.julday(
        utc_dt.year, utc_dt.month, utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600
    )
    
    # Compute planetary longitudes (sidereal — Vedic uses Lahiri ayanamsa)
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    
    planets = {}
    for name, planet_id in PLANETS.items():
        flags = swe.FLG_SIDEREAL | swe.FLG_SPEED
        pos, _ = swe.calc_ut(jd, planet_id, flags)
        lon = pos[0] % 360
        planet_data = _sign_from_longitude(lon)
        planet_data["retrograde"] = pos[3] < 0  # negative speed = retrograde
        planets[name] = planet_data
    
    # Ketu is always 180° opposite Rahu
    rahu_lon = planets["rahu"]["longitude"]
    ketu_lon = (rahu_lon + 180) % 360
    planets["ketu"] = _sign_from_longitude(ketu_lon)
    planets["ketu"]["retrograde"] = True  # Ketu is always retrograde by convention
    
    # Compute houses (Placidus — widely used for Vedic too)
    house_cusps, ascmc = swe.houses(jd, latitude, longitude, b'P')
    
    # Ascendant (sidereal)
    ayanamsa = swe.get_ayanamsa_ut(jd)
    asc_sidereal = (ascmc[0] - ayanamsa) % 360
    ascendant = _sign_from_longitude(asc_sidereal)
    
    houses = {}
    for i, cusp in enumerate(house_cusps):
        sid_cusp = (cusp - ayanamsa) % 360
        houses[f"house_{i+1}"] = _sign_from_longitude(sid_cusp)
    
    # Nakshatra from Moon
    moon_lon = planets["moon"]["longitude"]
    nakshatra = _nakshatra_from_moon_lon(moon_lon)
    
    # Vimshottari Dasha
    dashas = _compute_vimshottari_dasha(moon_lon, local_dt)
    current_dasha = _find_current_dasha(dashas)
    
    # Yogas
    yogas = _detect_basic_yogas(planets)
    
    return {
        "ascendant": ascendant,
        "sun_sign": planets["sun"]["sign"],
        "moon_sign": planets["moon"]["sign"],
        "planets": planets,
        "houses": houses,
        "nakshatra": nakshatra["name"],
        "nakshatra_pada": nakshatra["pada"],
        "nakshatra_lord": nakshatra["lord"],
        "mahadasha": {
            "all": dashas,
            "current": current_dasha
        },
        "yogas": yogas,
        "meta": {
            "ayanamsa": round(ayanamsa, 4),
            "julian_day": round(jd, 6),
            "utc_time": utc_dt.isoformat()
        }
    }
```

---

## Step 4 — Pydantic Schemas

### `backend/app/models/schemas.py`

```python
from pydantic import BaseModel
from datetime import date, time

class BirthChartRequest(BaseModel):
    full_name: str
    birth_date: date          # "1992-08-15"
    birth_time: time          # "07:34:00"
    birth_city: str           # "Mumbai, Maharashtra"
    gender: str               # "male" | "female" | "other"
    user_id: str              # Supabase user UUID

class BirthChartResponse(BaseModel):
    chart_id: str
    ascendant: str
    sun_sign: str
    moon_sign: str
    nakshatra: str
    nakshatra_pada: int
    current_dasha: dict
    planets: dict
    yogas: list
    message: str
```

---

## Step 5 — Chart Router

### `backend/app/routers/chart.py`

```python
from fastapi import APIRouter, HTTPException
from app.models.schemas import BirthChartRequest, BirthChartResponse
from app.services.geocoding import geocode_city
from app.services.chart_engine import compute_birth_chart
from app.db.supabase import supabase

router = APIRouter()

@router.post("/compute", response_model=BirthChartResponse)
def compute_chart(req: BirthChartRequest):
    # 1. Geocode city → lat/lon/timezone
    try:
        lat, lon, tz = geocode_city(req.birth_city)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # 2. Compute chart
    try:
        chart = compute_birth_chart(req.birth_date, req.birth_time, lat, lon, tz)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chart computation failed: {str(e)}")
    
    # 3. Save to Supabase
    result = supabase.table("birth_charts").insert({
        "user_id": req.user_id,
        "full_name": req.full_name,
        "birth_date": str(req.birth_date),
        "birth_time": str(req.birth_time),
        "birth_city": req.birth_city,
        "latitude": lat,
        "longitude": lon,
        "timezone": tz,
        "planets": chart["planets"],
        "houses": chart["houses"],
        "ascendant": chart["ascendant"]["sign"],
        "sun_sign": chart["sun_sign"],
        "moon_sign": chart["moon_sign"],
        "nakshatra": chart["nakshatra"],
        "nakshatra_pada": chart["nakshatra_pada"],
        "mahadasha": chart["mahadasha"],
        "yogas": chart["yogas"],
    }).execute()
    
    chart_id = result.data[0]["id"]
    
    return BirthChartResponse(
        chart_id=chart_id,
        ascendant=chart["ascendant"]["sign"],
        sun_sign=chart["sun_sign"],
        moon_sign=chart["moon_sign"],
        nakshatra=chart["nakshatra"],
        nakshatra_pada=chart["nakshatra_pada"],
        current_dasha=chart["mahadasha"]["current"],
        planets=chart["planets"],
        yogas=chart["yogas"],
        message=f"Chart computed successfully for {req.full_name}"
    )

@router.get("/{chart_id}")
def get_chart(chart_id: str):
    result = supabase.table("birth_charts").select("*").eq("id", chart_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Chart not found")
    return result.data[0]

@router.get("/user/{user_id}")
def get_user_charts(user_id: str):
    result = supabase.table("birth_charts").select("*").eq("user_id", user_id).execute()
    return {"charts": result.data}
```

---

## Step 6 — Test the API

```bash
# Start backend
cd backend && uvicorn app.main:app --reload

# Test with curl (replace user_id with any UUID for now)
curl -X POST http://localhost:8000/chart/compute \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Arjun Mehta",
    "birth_date": "1992-08-15",
    "birth_time": "07:34:00",
    "birth_city": "Mumbai, Maharashtra",
    "gender": "male",
    "user_id": "00000000-0000-0000-0000-000000000001"
  }'
```

Expected response (truncated):
```json
{
  "chart_id": "uuid-here",
  "ascendant": "Scorpio",
  "sun_sign": "Leo",
  "moon_sign": "Scorpio",
  "nakshatra": "Anuradha",
  "nakshatra_pada": 2,
  "current_dasha": { "lord": "Rahu", "start": "...", "end": "...", "years": 18 },
  "yogas": [...],
  "message": "Chart computed successfully for Arjun Mehta"
}
```

---

## ✅ Phase 03 Checklist

- [ ] `pyswisseph`, `geopy`, `timezonefinder` installed
- [ ] Swiss Ephemeris `.se1` files downloaded to `backend/ephe/`
- [ ] `geocode_city("Mumbai, Maharashtra")` returns correct lat/lon/timezone
- [ ] `compute_birth_chart()` returns all 9 planets + ascendant without errors
- [ ] `POST /chart/compute` with test data returns a valid JSON chart
- [ ] Chart is saved to `birth_charts` table in Supabase (visible in dashboard)
- [ ] `GET /chart/{chart_id}` retrieves the saved chart
- [ ] Sun sign, Moon sign, ascendant look correct for the test birth data

## What's NOT built yet
- No auth protecting the endpoints (Phase 04)
- No frontend form (Phase 05)
- No AI using the chart data (Phase 06)