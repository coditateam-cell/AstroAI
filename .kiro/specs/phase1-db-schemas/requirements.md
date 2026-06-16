# Requirements Document

## Introduction

Phase 1 of JyotishAI v2 focuses on rebuilding the database schema and backend data models to align with a strictly Western Tropical Astrology platform. The existing schema contains Vedic-specific columns (nakshatra, mahadasha, yogas, ascendant, sun_sign, moon_sign) that must be removed. The `supabase-schema.sql` file must be rewritten with a clean Western-only structure, and `backend/app/models/schemas.py` must be replaced with fully-typed Pydantic v2 models that mirror the new schema's JSONB structures.

## Glossary

- **System**: The JyotishAI backend, consisting of the Supabase PostgreSQL database and the FastAPI Python backend.
- **Supabase**: The hosted PostgreSQL + Auth platform used as the database layer.
- **RLS**: Row Level Security — Supabase/PostgreSQL policy mechanism ensuring users can only access their own rows.
- **JSONB**: PostgreSQL binary JSON column type used to store structured astrology data.
- **raw_astrology_data**: A JSONB column storing computed Western Tropical planet positions, house cusps, and chart angles.
- **detailed_report**: A JSONB column storing AI-generated narrative reports across personal, career, and love life dimensions, each with past/current/future timelines.
- **assessment**: A JSONB column on the sessions table storing a post-session summary, key insights, and action items.
- **Pydantic v2**: The Python data validation library used to define and enforce request/response schemas in FastAPI.
- **ChartComputeRequest**: The Pydantic model representing an incoming birth chart computation request.
- **ChartResponse**: The Pydantic model representing the response after a chart is computed and stored.
- **TokenGenerateRequest / TokenResponse**: Pydantic models for LiveKit session token generation.
- **Western Tropical Astrology**: Astrology system using the tropical zodiac and Placidus house system, with no Vedic elements.

---

## Requirements

### Requirement 1

**User Story:** As a backend developer, I want the `supabase-schema.sql` to define a clean Western-only `birth_charts` table, so that no Vedic columns pollute the schema.

#### Acceptance Criteria

1. WHEN the SQL schema is applied, THE System SHALL create the `public.birth_charts` table with columns: `id`, `user_id`, `full_name`, `birth_date`, `birth_time`, `birth_city`, `latitude`, `longitude`, `timezone`, `is_primary`, `computed_at`, `created_at`, `raw_astrology_data` (JSONB NOT NULL), and `detailed_report` (JSONB NOT NULL).
2. THE System SHALL NOT include any of the following columns in `public.birth_charts`: `nakshatra`, `nakshatra_pada`, `mahadasha`, `yogas`, `ascendant`, `sun_sign`, `moon_sign`, `planets` (standalone), `houses` (standalone), or `summary`.
3. WHEN the SQL schema is applied, THE System SHALL create the `public.sessions` table with a `livekit_room TEXT NOT NULL UNIQUE` column, a `duration_secs INT DEFAULT 0` column, and an `assessment JSONB` column replacing the old `summary TEXT` column.
4. WHEN the SQL schema is applied, THE System SHALL enable the `uuid-ossp` extension and the `pgcrypto` extension to support `gen_random_uuid()`.

---

### Requirement 2

**User Story:** As a backend developer, I want the `public.users` table to match the v2 specification exactly, so that user profile data is stored consistently.

#### Acceptance Criteria

1. WHEN the SQL schema is applied, THE System SHALL create the `public.users` table with columns: `id UUID PRIMARY KEY` referencing `auth.users(id) ON DELETE CASCADE`, `full_name TEXT`, `email TEXT UNIQUE`, `gender TEXT`, `plan TEXT DEFAULT 'free'`, `plan_expires_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ DEFAULT NOW()`, and `updated_at TIMESTAMPTZ DEFAULT NOW()`.
2. WHEN a row in `public.users` is updated, THE System SHALL automatically set `updated_at` to the current timestamp via a trigger.
3. WHEN a new user is created in `auth.users`, THE System SHALL automatically insert a corresponding row into `public.users` and `public.usage_limits` via the `handle_new_user` trigger function.

---

### Requirement 3

**User Story:** As a backend developer, I want all four tables to have explicit RLS policies, so that users can only read and write their own data.

#### Acceptance Criteria

1. WHEN RLS is enabled, THE System SHALL enforce that a user can only SELECT, INSERT, UPDATE, or DELETE rows in `public.users` where `auth.uid() = id`.
2. WHEN RLS is enabled, THE System SHALL enforce that a user can only SELECT, INSERT, UPDATE, or DELETE rows in `public.birth_charts` where `auth.uid() = user_id`.
3. WHEN RLS is enabled, THE System SHALL enforce that a user can only SELECT, INSERT, UPDATE, or DELETE rows in `public.sessions` where `auth.uid() = user_id`.
4. WHEN RLS is enabled, THE System SHALL enforce that a user can only SELECT, INSERT, UPDATE, or DELETE rows in `public.session_messages` where the parent session's `user_id` matches `auth.uid()`.
5. WHEN RLS is enabled, THE System SHALL enforce that a user can only SELECT, INSERT, UPDATE, or DELETE rows in `public.usage_limits` where `auth.uid() = user_id`.

---

### Requirement 4

**User Story:** As a backend developer, I want `schemas.py` to define fully-typed Pydantic v2 sub-models for all JSONB structures, so that nested JSON validation works seamlessly in FastAPI routes.

#### Acceptance Criteria

1. THE System SHALL define a `PlanetDetails` model with fields: `sign: str`, `degree: float`, `house: int`, `is_retrograde: bool`.
2. THE System SHALL define a `HouseDetails` model with fields: `sign: str`, `degree: float`.
3. THE System SHALL define an `AngleDetails` model with fields: `sign: str`, `degree: float`.
4. THE System SHALL define a `RawAstrologyData` model with fields: `planets: Dict[str, PlanetDetails]`, `houses: Dict[str, HouseDetails]`, `angles: Dict[str, AngleDetails]`.
5. THE System SHALL define a `TimelineReport` model with fields: `past: str`, `current: str`, `future: str`.
6. THE System SHALL define a `DetailedReport` model with fields: `personal: TimelineReport`, `career: TimelineReport`, `love: TimelineReport`.
7. THE System SHALL define a `SessionAssessment` model with fields: `session_summary: str`, `key_insights: List[str]`, `action_items: List[str]`.

---

### Requirement 5

**User Story:** As a backend developer, I want top-level request and response Pydantic models for chart computation and LiveKit token generation, so that FastAPI routes have strict input/output contracts.

#### Acceptance Criteria

1. THE System SHALL define a `ChartComputeRequest` model with fields: `full_name: str`, `birth_date: datetime.date`, `birth_time: datetime.time`, `birth_city: str`, `gender: str`, `user_id: uuid.UUID`.
2. THE System SHALL define a `ChartResponse` model with fields: `chart_id: uuid.UUID`, `full_name: str`, `raw_astrology_data: RawAstrologyData`, `detailed_report: DetailedReport`, `message: str`.
3. THE System SHALL define a `TokenGenerateRequest` model with field: `chart_id: uuid.UUID`.
4. THE System SHALL define a `TokenResponse` model with fields: `token: str`, `room_name: str`, `session_id: uuid.UUID`, `livekit_url: str`.
