# Requirements Document

## Introduction

Phase 3 introduces the OpenRouter Translation Engine for JyotishAI. This phase rewrites the chart computation service and its API endpoint to produce a fully Western Tropical birth chart, then passes the raw astronomical data to OpenRouter (via `gpt-4o-mini`) to generate a conversational, jargon-free 3-category (personal / career / love) × 3-timeline (past / current / future) narrative report. The final structured result is persisted to Supabase and returned to the caller.

This phase targets two files:
- `jyotishai/backend/app/services/chart_engine.py`
- `jyotishai/backend/app/routers/chart.py`

All Vedic concepts (nakshatras, dashas, yogas) are removed from user-facing logic. The existing geocoding utility (`geocoding.py`) and Pydantic schemas (`schemas.py`, already updated in Phase 2) are reused without modification.

## Glossary

- **Chart Engine:** The Python module `chart_engine.py` responsible for ephemeris calculations and OpenRouter report generation.
- **OpenRouter:** The LLM gateway at `https://openrouter.ai/api/v1` used for all AI text generation.
- **Raw Astrology Data:** A structured dict matching the `RawAstrologyData` Pydantic schema — planets, houses (keyed `"1"`–`"12"`), and angles (ascendant, midheaven).
- **Detailed Report:** A structured dict matching the `DetailedReport` Pydantic schema — three `TimelineReport` objects (personal, career, love), each with past / current / future narrative strings.
- **Western Tropical:** Placidus house system, no ayanamsa, no sidereal correction.
- **compute_raw_western_data:** The synchronous function in `chart_engine.py` that geocodes a city and runs pyswisseph calculations, returning a `Raw Astrology Data` dict.
- **generate_human_report:** The async function in `chart_engine.py` that sends `Raw Astrology Data` to OpenRouter and returns a `Detailed Report` dict.
- **ChartComputeRequest:** The Pydantic request model accepted by `POST /chart/compute`.
- **ChartResponse:** The Pydantic response model returned by `POST /chart/compute`.
- **Supabase:** The PostgreSQL-backed database accessed via the `supabase-py` client.
- **Settings:** The `app.config.settings` object that exposes `OPENROUTER_API_KEY` and other secrets from the `.env` file.

---

## Requirements

### Requirement 1 — Western Tropical Ephemeris Calculation

**User Story:** As a backend service, I want a synchronous function that computes a complete Western Tropical birth chart from a birth date, time, and city, so that downstream components receive structured planetary and house data without any Vedic concepts.

#### Acceptance Criteria

1. WHEN `compute_raw_western_data` is called with a valid birth date, birth time, and city string, THE Chart Engine SHALL geocode the city using the existing `geocode_city` utility and return latitude, longitude, and timezone.
2. WHEN computing planetary positions, THE Chart Engine SHALL use pyswisseph in tropical mode (no `FLG_SIDEREAL`, no ayanamsa subtraction) for all ten planets: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto.
3. WHEN computing house cusps, THE Chart Engine SHALL use the Placidus house system and return all 12 house cusps keyed as strings `"1"` through `"12"`, each containing `sign` and `degree`.
4. WHEN computing angles, THE Chart Engine SHALL return an `angles` dict containing `ascendant` and `midheaven`, each with `sign` and `degree`.
5. WHEN assigning a planet to a house, THE Chart Engine SHALL determine the house number by comparing the planet's ecliptic longitude against the 12 Placidus house cusp boundaries and store it as `house` (integer 1–12) in the planet's data.
6. THE Chart Engine SHALL return a dict that is structurally valid against the `RawAstrologyData` Pydantic schema, with no Vedic fields (no nakshatras, dashas, or yogas).

---

### Requirement 2 — OpenRouter AI Report Generation

**User Story:** As a backend service, I want an async function that sends raw chart data to OpenRouter and receives a structured conversational report, so that users get human-readable life insights without astrological jargon.

#### Acceptance Criteria

1. WHEN `generate_human_report` is called and `settings.OPENROUTER_API_KEY` is an empty string or `None`, THE Chart Engine SHALL return a hardcoded fallback `Detailed Report` dict without making any HTTP request.
2. WHEN `generate_human_report` makes an HTTP request, THE Chart Engine SHALL POST to `https://openrouter.ai/api/v1/chat/completions` using `httpx.AsyncClient` with a 30-second timeout, the `Authorization: Bearer <key>` header, and `"response_format": {"type": "json_object"}` in the payload.
3. WHEN the OpenRouter response has HTTP status 200, THE Chart Engine SHALL parse `choices[0].message.content` as JSON and return it as the `Detailed Report` dict.
4. IF the OpenRouter HTTP response status is not 200 or a network exception occurs, THEN THE Chart Engine SHALL return a safe fallback `Detailed Report` dict with non-empty placeholder strings for all nine fields.
5. WHEN constructing the prompt, THE Chart Engine SHALL instruct the model to produce jargon-free, conversational narratives and SHALL NOT include technical astrological aspect names (e.g., "Mars square Venus") in the output.
6. WHEN constructing the prompt, THE Chart Engine SHALL request a JSON object with keys `personal`, `career`, and `love`, each containing `past`, `current`, and `future` string fields.

---

### Requirement 3 — Chart Compute API Endpoint

**User Story:** As a frontend client, I want a `POST /chart/compute` endpoint that accepts birth details and returns a fully computed chart with a human narrative report, so that I can display both raw data and conversational insights in the UI.

#### Acceptance Criteria

1. WHEN a `POST /chart/compute` request is received with a valid `ChartComputeRequest` body, THE Chart Router SHALL call `compute_raw_western_data` to obtain the `Raw Astrology Data` dict.
2. WHEN `Raw Astrology Data` is available, THE Chart Router SHALL call `generate_human_report` with that data to obtain the `Detailed Report` dict.
3. WHEN both data objects are ready, THE Chart Router SHALL insert a single row into the Supabase `birth_charts` table containing `user_id`, `full_name`, `birth_date`, `birth_time`, `birth_city`, `latitude`, `longitude`, `timezone`, `raw_astrology_data`, `detailed_report`, and `is_primary: true`.
4. IF the Supabase insert returns no data, THEN THE Chart Router SHALL raise an HTTP 500 error with a descriptive message.
5. WHEN the Supabase insert succeeds, THE Chart Router SHALL return a `ChartResponse` with `chart_id`, `full_name`, `raw_astrology_data`, `detailed_report`, and `message` populated from the inserted row.
6. WHILE the endpoint is processing, THE Chart Router SHALL propagate geocoding errors as HTTP 400 responses and ephemeris computation errors as HTTP 500 responses.

---

### Requirement 4 — Supabase Persistence Client

**User Story:** As a backend service, I want the Supabase client to be accessible via a `get_supabase_client` factory function, so that the router can obtain a client instance without importing a module-level singleton directly.

#### Acceptance Criteria

1. THE Supabase module SHALL expose a `get_supabase_client` function that returns the initialized `supabase-py` `Client` instance.
2. WHEN `get_supabase_client` is called, THE Supabase module SHALL return the same singleton client that is already constructed from `settings.supabase_url` and `settings.supabase_service_role_key`.
