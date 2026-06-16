We are executing Phase 1: Database & Data Schemas. You must completely rewrite the following two files with 100% full implementations, zero placeholders, and zero `# TODO` comments. 

1. `backend/supabase-schema.sql`
2. `backend/app/models/schemas.py`

Follow these exact technical constraints to avoid any architectural confusion:

---

### 1. SPECIFICATIONS FOR: backend/supabase-schema.sql

Completely strip out any old Vedic columns (like nakshatra, mahadasha, yogas, ascendant, sun_sign, moon_sign) from the `birth_charts` table. Re-create or alter the tables to match this precise structure:

- **Table: public.users**
  - `id` UUID PRIMARY KEY (references auth.users(id) ON DELETE CASCADE)
  - `full_name` TEXT
  - `email` TEXT UNIQUE
  - `gender` TEXT
  - `plan` TEXT DEFAULT 'free'
  - `plan_expires_at` TIMESTAMPTZ
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `updated_at` TIMESTAMPTZ DEFAULT NOW()

- **Table: public.birth_charts**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id` UUID REFERENCES public.users(id) ON DELETE CASCADE
  - `full_name` TEXT
  - `birth_date` DATE NOT NULL
  - `birth_time` TIME NOT NULL
  - `birth_city` TEXT NOT NULL
  - `latitude` NUMERIC(9,6) NOT NULL
  - `longitude` NUMERIC(9,6) NOT NULL
  - `timezone` TEXT NOT NULL
  - `is_primary` BOOLEAN DEFAULT true
  - `computed_at` TIMESTAMPTZ DEFAULT NOW()
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `raw_astrology_data` JSONB NOT NULL
    /* Structure constraint for raw_astrology_data:
       {
         "planets": {
           "sun": { "sign": "Taurus", "degree": 21.4, "house": 9, "is_retrograde": false },
           "moon": { "sign": "Aquarius", "degree": 18.2, "house": 6, "is_retrograde": false },
           ... (mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto)
         },
         "houses": {
           "1": { "sign": "Leo", "degree": 11.2 },
           ... (1 through 12)
         },
         "angles": {
           "ascendant": { "sign": "Leo", "degree": 11.2 },
           "midheaven": { "sign": "Taurus", "degree": 9.1 }
         }
       }
    */
  - `detailed_report` JSONB NOT NULL
    /* Structure constraint for detailed_report:
       {
         "personal": { "past": "...", "current": "...", "future": "..." },
         "career": { "past": "...", "current": "...", "future": "..." },
         "love": { "past": "...", "current": "...", "future": "..." }
       }
    */

- **Table: public.sessions**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id` UUID REFERENCES public.users(id) ON DELETE CASCADE
  - `birth_chart_id` UUID REFERENCES public.birth_charts(id) ON DELETE CASCADE
  - `livekit_room` TEXT NOT NULL UNIQUE
  - `status` TEXT DEFAULT 'active' -- 'active', 'ended', 'error'
  - `started_at` TIMESTAMPTZ DEFAULT NOW()
  - `ended_at` TIMESTAMPTZ
  - `duration_secs` INT DEFAULT 0
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `assessment` JSONB
    /* Structure constraint for assessment:
       {
         "session_summary": "Overall summary of what the user discussed with Celeste.",
         "key_insights": ["Insight 1", "Insight 2"],
         "action_items": ["Action 1", "Action 2"]
       }
    */

- **Table: public.session_messages** and **public.usage_limits** must remain intact with their existing columns, but ensure all Row Level Security (RLS) policies are fully explicitly stated.

---

### 2. SPECIFICATIONS FOR: backend/app/models/schemas.py

Create matching Pydantic v2 models to enforce strict parsing and validation for the backend routes. You must write out the sub-models completely so nested JSON validation works seamlessly:

- **TimelineReport (Sub-model):** contains `past: str`, `current: str`, `future: str`
- **DetailedReport (Sub-model):** contains `personal: TimelineReport`, `career: TimelineReport`, `love: TimelineReport`
- **PlanetDetails (Sub-model):** contains `sign: str`, `degree: float`, `house: int`, `is_retrograde: bool`
- **HouseDetails (Sub-model):** contains `sign: str`, `degree: float`
- **AngleDetails (Sub-model):** contains `sign: str`, `degree: float`
- **RawAstrologyData (Sub-model):**
  - `planets`: Dict[str, PlanetDetails]
  - `houses`: Dict[str, HouseDetails]
  - `angles`: Dict[str, AngleDetails]
- **SessionAssessment (Sub-model):** contains `session_summary: str`, `key_insights: List[str]`, `action_items: List[str]`

- **ChartComputeRequest:**
  - `full_name: str`
  - `birth_date: datetime.date`
  - `birth_time: datetime.time`
  - `birth_city: str`
  - `gender: str`
  - `user_id: uuid.UUID`

- **ChartResponse:**
  - `chart_id: uuid.UUID`
  - `full_name: str`
  - `raw_astrology_data: RawAstrologyData`
  - `detailed_report: DetailedReport`
  - `message: str`

- **TokenGenerateRequest:**
  - `chart_id: uuid.UUID`

- **TokenResponse:**
  - `token: str`
  - `room_name: str`
  - `session_id: uuid.UUID`
  - `livekit_url: str`

Generate the full content for both files now. Ensure all necessary extensions (`uuid-ossp`) and triggers are completely included in the SQL file, and all correct typing imports (`List`, `Dict`, `Optional`) are handled in the Python file.