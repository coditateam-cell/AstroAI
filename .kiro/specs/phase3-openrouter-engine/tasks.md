# Implementation Plan

- [x] 1. Add `get_supabase_client` factory to `db/supabase.py`





  - Add a `get_supabase_client()` function that returns the existing module-level `supabase` singleton
  - No changes to existing imports or singleton construction
  - _Requirements: 4.1, 4.2_

- [x] 2. Rewrite `chart_engine.py` — Western Tropical ephemeris calculation





- [x] 2.1 Implement `compute_raw_western_data(birth_date, birth_time, city) -> dict`


  - Remove all Vedic code (nakshatras, dashas, yogas, Rahu/Ketu, NAKSHATRA_LORDS, DASHA_YEARS constants)
  - Add Uranus, Neptune, Pluto to the PLANETS dict
  - Set tropical mode via `swe.set_sid_mode(swe.SIDM_FAGAN_BRADLEY, 0, 0)` and use `swe.FLG_SPEED` only
  - Geocode city using existing `geocode_city` utility
  - Compute Julian Day from birth date/time + timezone
  - Compute 10 planetary longitudes; derive `sign`, `degree`, `is_retrograde` for each
  - Compute Placidus house cusps via `swe.houses(jd, lat, lon, b'P')`
  - Assign each planet to a house (1–12) by comparing longitude against cusp boundaries
  - Build `houses` dict keyed `"1"` through `"12"` with `sign` and `degree`
  - Build `angles` dict with `ascendant` and `midheaven` entries
  - Embed `_meta` dict (latitude, longitude, timezone) in the return value
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2.2 Implement `generate_human_report(raw_data: dict) -> dict` (async)


  - Strip `_meta` key from `raw_data` before building the prompt
  - Return hardcoded fallback dict immediately when `settings.OPENROUTER_API_KEY` is falsy
  - POST to `https://openrouter.ai/api/v1/chat/completions` using `httpx.AsyncClient(timeout=30.0)`
  - Include `Authorization`, `Content-Type`, `HTTP-Referer`, `X-Title` headers
  - Set model `openai/gpt-4o-mini`, `temperature=0.7`, `response_format: {"type": "json_object"}`
  - Prompt instructs jargon-free output with exact JSON shape: `personal/career/love` × `past/current/future`
  - On HTTP 200: parse `choices[0].message.content` as JSON and return
  - On non-200 or any exception: return safe fallback dict with non-empty strings for all nine fields
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.3 Write unit tests for `chart_engine.py`


  - Test `compute_raw_western_data` with a known birth date/city; assert 10 planets, 12 house keys, both angle keys, degrees 0–30, house numbers 1–12
  - Test `generate_human_report` fallback when API key is empty
  - Test `generate_human_report` success path with mocked `httpx` response
  - _Requirements: 1.1–1.6, 2.1–2.6_

- [x] 3. Rewrite `routers/chart.py` — `POST /chart/compute` endpoint





- [x] 3.1 Implement the `POST /chart/compute` endpoint


  - Change request model to `ChartComputeRequest` and response model to `ChartResponse` (status 201)
  - Call `compute_raw_western_data(birth_date, birth_time, birth_city)`; catch `ValueError` → HTTP 400, generic `Exception` → HTTP 500
  - Extract `latitude`, `longitude`, `timezone` from `raw_astro["_meta"]`
  - Call `await generate_human_report(raw_astro)` for the narrative report
  - Build `db_payload` with all required columns and `is_primary: True`; use `get_supabase_client()` for the insert
  - Raise HTTP 500 if `db_res.data` is empty
  - Return `ChartResponse` constructed from the inserted row
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3.2 Retain existing read endpoints

  - Keep `GET /user/{user_id}` and `GET /{chart_id}` handlers unchanged
  - _Requirements: 3.1_

- [x] 3.3 Write integration test for `POST /chart/compute`


  - Use FastAPI `TestClient` with mocked `compute_raw_western_data` and `generate_human_report`
  - Assert HTTP 201 and valid `ChartResponse` JSON body
  - _Requirements: 3.1–3.6_
