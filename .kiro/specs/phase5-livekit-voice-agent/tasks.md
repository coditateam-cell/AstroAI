# Implementation Plan

- [x] 1. Add `fetch_chart_data` to `agent/chart_client.py`





  - Add an async `fetch_chart_data(room_name: str) -> dict` function that wraps the existing `fetch_chart_for_room` and returns the raw dict (or `{}` on failure)
  - This is the entry point the rewritten agent will call
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. Rewrite `agent/main.py` with correct livekit-agents v1.x API





- [x] 2.1 Fix all broken imports and plugin instantiation


  - Replace `inference.STT`, `inference.LLM`, `sarvam.TTS`, `MultilingualModel` with `deepgram.STT`, `openai.LLM` (pointed at OpenRouter base URL), `elevenlabs.TTS`, `silero.VAD.load()`
  - Replace `VoicePipelineAgent` usage with `AgentSession` + `JyotishAgent(Agent)` subclass
  - _Requirements: 1.1, 1.2_

- [x] 2.2 Wire system prompt to `detailed_report` narrative blocks


  - Call `fetch_chart_data(ctx.room.name)` at session start
  - Build Celeste's system prompt by embedding `json.dumps(detailed_report, indent=2)` with the persona rules and hard constraints
  - Fall back to a generic greeting when chart fetch returns an empty dict
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.3 Implement message persistence hooks


  - Resolve `session_id` from `public.sessions` using the room name via the Supabase client
  - Register `user_speech_committed` and `agent_speech_committed` event handlers that insert rows into `public.session_messages`
  - Wrap all DB calls in try/except so failures log and continue without crashing the pipeline
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2.4 Write unit tests for `fetch_chart_data`


  - Mock `httpx.AsyncClient` to verify correct endpoint, headers, and empty-dict fallback on non-200
  - _Requirements: 5.1, 5.4_

- [x] 3. Extend `backend/app/routers/token.py` webhook with post-session assessment





- [x] 3.1 Implement `generate_post_session_assessment` async helper


  - Fetch all `session_messages` rows for the session ordered by `created_at`
  - Assemble plain-text transcript and POST to OpenRouter with `response_format: {"type": "json_object"}`
  - Validate response against `SessionAssessment` schema and UPDATE `public.sessions.assessment`
  - Return early silently if transcript is empty; catch and log all errors without re-raising
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 3.2 Call `generate_post_session_assessment` from the `room_finished` webhook branch


  - After the existing status/duration update, call `await generate_post_session_assessment(session["id"])`
  - Ensure the webhook route handler is declared `async` so the await is valid
  - _Requirements: 4.1, 4.5_

- [x] 3.3 Write unit tests for `generate_post_session_assessment`


  - Mock Supabase client and `httpx.AsyncClient` to verify transcript assembly, OpenRouter payload, and DB update call
  - Verify early-return behaviour when transcript is empty
  - _Requirements: 4.6, 4.7_
