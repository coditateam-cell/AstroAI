# Implementation Plan

- [x] 1. Rewrite `jyotishai/backend/supabase-schema.sql`





  - Drop all Vedic columns (`nakshatra`, `nakshatra_pada`, `mahadasha`, `yogas`, `ascendant`, `sun_sign`, `moon_sign`, standalone `planets`, standalone `houses`) from `birth_charts`
  - Add `raw_astrology_data JSONB NOT NULL` and `detailed_report JSONB NOT NULL` to `birth_charts`
  - Replace `summary TEXT` with `assessment JSONB` on `sessions`; enforce `livekit_room TEXT NOT NULL UNIQUE` and `duration_secs INT DEFAULT 0`
  - Enable `uuid-ossp` and `pgcrypto` extensions at the top of the file
  - Keep `session_messages` and `usage_limits` table definitions intact
  - Include all indexes, the `update_updated_at_column` trigger, and the `handle_new_user` trigger
  - Explicitly state all five RLS policies (users, birth_charts, sessions, session_messages, usage_limits)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Rewrite `jyotishai/backend/app/models/schemas.py`





- [x] 2.1 Implement all JSONB sub-models


  - Write `PlanetDetails`, `HouseDetails`, `AngleDetails`, `RawAstrologyData` models
  - Write `TimelineReport`, `DetailedReport`, `SessionAssessment` models
  - Use correct Pydantic v2 imports (`from pydantic import BaseModel`) and standard library imports (`import datetime`, `import uuid`, `from typing import Dict, List, Optional`)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 2.2 Implement top-level request and response models


  - Write `ChartComputeRequest` with `full_name`, `birth_date`, `birth_time`, `birth_city`, `gender`, `user_id`
  - Write `ChartResponse` with `chart_id`, `full_name`, `raw_astrology_data`, `detailed_report`, `message`
  - Write `TokenGenerateRequest` with `chart_id`
  - Write `TokenResponse` with `token`, `room_name`, `session_id`, `livekit_url`
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2.3 Write unit tests for Pydantic models


  - Test valid instantiation of each sub-model and top-level model
  - Test that invalid types (e.g. string where float expected) raise `ValidationError`
  - _Requirements: 4.1–4.7, 5.1–5.4_
