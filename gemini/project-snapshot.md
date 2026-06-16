# JyotishAI — Full Project Snapshot

> Generated for AI architectural review. All sensitive values are redacted.

---

## 1. Project Directory Tree

```
jyotishai/
├── README.md
├── .gitignore
│
├── agent/                          # LiveKit voice agent (Python)
│   ├── main.py                     # Agent entrypoint + session lifecycle
│   ├── prompts.py                  # System prompt builder (Celeste persona)
│   ├── chart_client.py             # HTTP client → backend /agent/chart-for-room
│   ├── requirements.txt            # Agent-specific deps
│   ├── README.md
│   └── .env                        # LIVEKIT_*, SUPABASE_*, BACKEND_URL
│
├── backend/                        # FastAPI REST API (Python)
│   ├── app/
│   │   ├── main.py                 # FastAPI app + CORS + router registration
│   │   ├── auth.py                 # Supabase JWT validation (HS256 + ES256)
│   │   ├── config.py               # Pydantic settings (env vars)
│   │   ├── db/
│   │   │   └── supabase.py         # Supabase Python client singleton
│   │   ├── models/
│   │   │   └── schemas.py          # Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── chart.py            # POST /chart/compute, GET /chart/{id}
│   │   │   ├── token.py            # POST /token/generate, POST /token/webhook
│   │   │   ├── user.py             # GET /user/ping, GET /user/test-db
│   │   │   └── agent.py            # GET /agent/chart-for-room (internal)
│   │   └── services/
│   │       ├── chart_engine.py     # pyswisseph chart computation
│   │       └── geocoding.py        # City → lat/lon/timezone (geopy + timezonefinder)
│   ├── ephe/                       # Swiss Ephemeris data files (.se1)
│   │   ├── seas_18.se1
│   │   ├── semo_18.se1
│   │   └── sepl_18.se1
│   ├── requirements.txt
│   ├── supabase-schema.sql         # Full DB schema + RLS policies
│   ├── TEST_DB.md
│   └── .env                        # SUPABASE_*, LIVEKIT_*, JWT_SECRET
│
└── frontend/                       # Next.js 15 App Router (TypeScript)
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                # Landing / redirect
    │   ├── globals.css
    │   ├── auth/
    │   │   ├── login/page.tsx      # Supabase Auth UI (email/password + OAuth)
    │   │   └── callback/route.ts   # OAuth callback handler
    │   ├── onboarding/page.tsx     # Birth details form → chart computation
    │   └── session/page.tsx        # LiveKit room + voice session
    ├── components/
    │   ├── SessionUI.tsx           # Voice UI (BarVisualizer, controls, transcript)
    │   ├── ChartPreview.tsx        # Chart result card after computation
    │   ├── Navbar.tsx
    │   └── StarField.tsx           # Animated background
    ├── lib/
    │   ├── api.ts                  # Authenticated fetch helpers (apiPost, apiGet)
    │   ├── supabase.ts             # Re-export
    │   ├── hooks/
    │   │   └── useUser.ts          # Auth state hook
    │   └── supabase/
    │       ├── client.ts           # Browser Supabase client
    │       ├── server.ts           # Server Supabase client (RSC)
    │       └── middleware.ts       # Session refresh helper
    ├── middleware.ts               # Next.js middleware (auth guard)
    ├── next.config.mjs
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## 2. Tech Stack & Libraries

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Auth | Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) |
| Voice UI | `@livekit/components-react` v2, `livekit-client` v2 |
| Styling | Tailwind CSS v3 + inline CSS-in-JS |
| Animations | Framer Motion v12 |
| Toasts | react-hot-toast |
| HTTP | Native `fetch` (wrapped in `lib/api.ts`) |

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.111 + Uvicorn |
| Auth validation | `python-jose` (JWT HS256 + ES256 via JWKS) |
| Astrology engine | `pyswisseph` 2.10 (Swiss Ephemeris C bindings) |
| Geocoding | `geopy` (Nominatim) + `timezonefinder` |
| Database client | `supabase-py` 2.10 |
| LiveKit token | `livekit` Python SDK (`livekit.api.AccessToken`) |
| Config | `pydantic-settings` |

### Agent
| Layer | Technology |
|---|---|
| Framework | `livekit-agents` 1.5 |
| STT | Deepgram Nova-3 (`livekit-plugins-deepgram`) |
| LLM | OpenAI GPT-4.1-mini (`livekit-plugins-openai`) |
| TTS | ElevenLabs (`livekit-plugins-elevenlabs`) |
| VAD | Silero (`livekit-plugins-silero`) |
| Chart fetch | `httpx` async HTTP → backend `/agent/chart-for-room` |

### Database
| Layer | Technology |
|---|---|
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (built-in) |
| ORM | Direct PostgREST via `supabase-py` |
| Storage | Supabase Storage (not yet used) |

---

## 3. Database Schema

### `public.users`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | References `auth.users(id)` |
| `full_name` | TEXT | |
| `email` | TEXT UNIQUE | |
| `gender` | TEXT | `male / female / other` |
| `plan` | TEXT | `free / basic / pro` (default `free`) |
| `plan_expires_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

Auto-created on `auth.users` INSERT via `handle_new_user()` trigger.

---

### `public.birth_charts`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `user_id` | UUID FK | → `users(id)` CASCADE |
| `full_name` | TEXT | |
| `birth_date` | DATE | |
| `birth_time` | TIME | |
| `birth_city` | TEXT | |
| `latitude` | NUMERIC(9,6) | |
| `longitude` | NUMERIC(9,6) | |
| `timezone` | TEXT | e.g. `Asia/Kolkata` |
| `planets` | JSONB | All planetary positions |
| `houses` | JSONB | 12 house cusps |
| `ascendant` | TEXT | Sign name |
| `sun_sign` | TEXT | |
| `moon_sign` | TEXT | |
| `nakshatra` | TEXT | |
| `nakshatra_pada` | INT | 1–4 |
| `mahadasha` | JSONB | `{ all: [...], current: {...} }` |
| `yogas` | JSONB | Array of detected yogas |
| `is_primary` | BOOLEAN | Default `true` |
| `computed_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

---

### `public.sessions`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK | → `users(id)` |
| `birth_chart_id` | UUID FK | → `birth_charts(id)` |
| `livekit_room` | TEXT | e.g. `session_abc12345_def67890` |
| `status` | TEXT | `active / ended / error` |
| `started_at` | TIMESTAMPTZ | |
| `ended_at` | TIMESTAMPTZ | |
| `duration_secs` | INT | |
| `summary` | TEXT | (not yet populated) |
| `created_at` | TIMESTAMPTZ | |

---

### `public.session_messages`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `session_id` | UUID FK | → `sessions(id)` CASCADE |
| `role` | TEXT | `user / assistant` |
| `content` | TEXT | Transcript text |
| `created_at` | TIMESTAMPTZ | |

---

### `public.usage_limits`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID UNIQUE FK | |
| `daily_secs_used` | INT | Rolling daily counter |
| `daily_reset_at` | TIMESTAMPTZ | |
| `monthly_secs_used` | INT | |
| `month_reset_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** All tables have Row Level Security enabled. Users can only access their own rows. `session_messages` access is gated via session ownership join.

---

## 4. API Endpoints

### Base URL: `http://localhost:8000`

---

#### `GET /health`
Health check.
```json
{ "status": "ok", "service": "JyotishAI API" }
```

---

#### `POST /chart/compute`
Compute and persist a birth chart.

**Auth:** Bearer JWT (Supabase)

**Request body:**
```json
{
  "full_name": "Arjun Sharma",
  "birth_date": "1990-05-15",
  "birth_time": "14:30:00",
  "birth_city": "Mumbai, Maharashtra",
  "gender": "male",
  "user_id": "<uuid>"
}
```

**Response:**
```json
{
  "chart_id": "<uuid>",
  "ascendant": "Virgo",
  "sun_sign": "Taurus",
  "moon_sign": "Scorpio",
  "nakshatra": "Anuradha",
  "nakshatra_pada": 2,
  "current_dasha": { "lord": "Saturn", "start": "...", "end": "...", "years": 12.5 },
  "planets": {
    "sun": { "sign": "Taurus", "sign_index": 1, "degree": 24.3, "longitude": 54.3, "retrograde": false },
    "moon": { "sign": "Scorpio", ... },
    "...": "..."
  },
  "yogas": [
    { "name": "Budha-Aditya Yoga", "description": "...", "planets": ["Sun", "Mercury"] }
  ],
  "message": "Chart computed successfully for Arjun Sharma"
}
```

---

#### `GET /chart/{chart_id}`
Fetch a single chart by ID.

**Response:** Full `birth_charts` row as JSON.

---

#### `GET /chart/user/{user_id}`
Fetch all charts for a user.

**Response:** `{ "charts": [...] }`

---

#### `POST /token/generate`
Generate a LiveKit access token and create a session record.

**Auth:** Bearer JWT (Supabase)

**Request body:**
```json
{ "chart_id": "<uuid>" }
```

**Response:**
```json
{
  "token": "<livekit-jwt>",
  "room_name": "session_abc12345_def67890",
  "session_id": "<uuid>",
  "livekit_url": "wss://your-livekit-server.livekit.cloud"
}
```

---

#### `POST /token/webhook`
LiveKit webhook receiver. Handles `room_finished` to mark session as ended and compute duration.

---

#### `GET /agent/chart-for-room?room=<room_name>`
**Internal endpoint** — called only by the agent process.

**Auth:** `X-Agent-Secret` header (shared secret)

Looks up the active session for the given room name, then returns the full `birth_charts` row.

**Response:** Full chart JSON (same shape as `birth_charts` table row).

---

#### `GET /user/ping`
Liveness check for user router.

#### `GET /user/test-db`
Returns first 5 rows from `users` table (dev/debug only).

---

## 5. LiveKit Agent Configuration

### File: `agent/main.py`

#### Entrypoint flow

```
LiveKit Agents framework calls entrypoint(ctx: JobContext)
  │
  ├─ 1. Fetch chart: GET /agent/chart-for-room?room={ctx.room.name}
  │       → Returns birth chart JSON or None
  │
  ├─ 2. Build system prompt
  │       → build_system_prompt(chart, chart_context)
  │       → Celeste persona + full chart data injected as text block
  │
  ├─ 3. ctx.connect()  ← joins the LiveKit room
  │
  ├─ 4. Build AgentSession pipeline:
  │       STT  → Deepgram Nova-3 (multilingual)
  │       LLM  → OpenAI GPT-4.1-mini
  │       TTS  → ElevenLabs (or Sarvam TTS for Hindi)
  │       VAD  → Silero
  │       turn_detection → MultilingualModel
  │
  ├─ 5. session.start(room, agent=JyotishAgent, noise_cancellation=True)
  │
  ├─ 6. Register Supabase message listeners:
  │       @session.on("user_speech_committed")  → INSERT session_messages (role=user)
  │       @session.on("agent_speech_committed") → INSERT session_messages (role=assistant)
  │
  └─ 7. Opening greeting via session.say(...)
```

#### Agent persona: Celeste

- Western tropical astrologer, 40 years experience
- Warm, empathetic, conversational
- References actual planetary positions from the injected chart data
- Responds in the user's language (Hindi or English)
- Hard rules: no death/illness predictions, no guarantees, no medical/legal advice

#### Chart context injected into system prompt

```
BIRTH CHART DATA (Natal / Tropical)
===================================
Name: Arjun Sharma
Ascendant: Virgo
Sun Sign: Taurus
Moon Sign: Scorpio

PLANETARY POSITIONS (Tropical / Western)
  - Sun: Taurus at 24.3°
  - Moon: Scorpio at 12.1°
  - Mars: Gemini at 5.7°
  - ...
  - North Node: Aries at 18.2°
  - South Node: Libra at 18.2° (retrograde)

HOUSE CUSPS (Placidus System)
  - House 1: Virgo Cusp at 14.0°
  - House 2: Libra Cusp at 10.2°
  - ...
```

#### Room name convention

`session_{user_id_first_8_chars}_{random_8_hex}`

Example: `session_a1b2c3d4_f9e8d7c6`

The agent uses this room name to call `/agent/chart-for-room` and retrieve the correct chart.

---

## 6. Chart Computation Engine

### File: `backend/app/services/chart_engine.py`

- Library: `pyswisseph` (Python bindings for Swiss Ephemeris C library)
- Ephemeris files: `backend/ephe/*.se1` (1800–2400 CE range)
- Default system: **Western tropical** (Placidus houses, no ayanamsa)
- Also supports: **Vedic sidereal** (Lahiri ayanamsa, same Placidus houses)

**Computed outputs:**
- Planetary longitudes for Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu (Mean Node), Ketu (derived)
- 12 Placidus house cusps
- Ascendant sign
- Nakshatra + pada (always from sidereal Moon)
- Vimshottari Dasha sequence (9 periods, current period highlighted)
- Basic yoga detection: Gajakesari, Budha-Aditya, Chandra-Mangala, Shukra-Chandra

---

## 7. Authentication Flow

1. User signs up/logs in via Supabase Auth (email/password or OAuth)
2. Supabase issues a JWT (HS256 or ES256 depending on project config)
3. Frontend stores session in cookies via `@supabase/ssr`
4. All API calls include `Authorization: Bearer <jwt>` header
5. Backend validates JWT in `auth.py`:
   - HS256: validated against `SUPABASE_JWT_SECRET`
   - ES256: validated against JWKS fetched from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` (cached 1 hour)
6. User UUID extracted from `payload["sub"]`

---

## 8. Frontend Page Flow

```
/ (root)
  └─ Redirect to /auth/login if not authenticated

/auth/login
  └─ Supabase Auth UI → on success → /onboarding

/onboarding
  ├─ Form: full_name, birth_date, birth_time, birth_city, gender
  ├─ POST /chart/compute → shows ChartPreview component
  └─ "Start Session" button → /session?chart_id=<uuid>

/session
  ├─ POST /token/generate → gets LiveKit token + room_name
  ├─ <LiveKitRoom token={...} serverUrl={...}>
  │     <RoomAudioRenderer />
  │     <SessionUI sessionId={...} />
  └─ SessionUI: BarVisualizer, mute/unmute, end session, transcript display
```

---

## 9. Environment Variables

### Backend `.env`
```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_JWT_SECRET=<jwt_secret>
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
LIVEKIT_URL=wss://<project>.livekit.cloud
BACKEND_AGENT_SECRET=<shared_secret>
```

### Agent `.env`
```
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
OPENAI_API_KEY=<key>
DEEPGRAM_API_KEY=<key>
ELEVENLABS_API_KEY=<key>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
BACKEND_URL=http://localhost:8000
BACKEND_AGENT_SECRET=<shared_secret>
```

### Frontend `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## 10. Known Issues / In-Progress Items

Based on `implementation/` phase docs and code review:

1. **Agent `main.py` has broken references** — `inference.STT`, `inference.LLM`, `sarvam.TTS`, `MultilingualModel` are referenced but not imported. The agent will fail to start as-is. These need to be replaced with the correct `livekit.plugins.*` imports.

2. **`/agent/chart-for-room` auth not enforced** — The `verify_agent_secret` dependency is defined but not applied to the route decorator in `agent.py`.

3. **`usage_limits` table not enforced** — The table exists in the schema but no middleware or route logic checks or increments usage counters.

4. **Session transcript not displayed in UI** — `SessionUI.tsx` has a `messages` state array but no code populates it from LiveKit events. The `@session.on` listeners in the agent write to Supabase but the frontend doesn't poll or subscribe.

5. **`ChartPreview` component** — Referenced in `onboarding/page.tsx` but not included in this snapshot (exists at `components/ChartPreview.tsx`).

6. **Supabase issues** — `implementation/supabase_issues_investigation.md` exists, suggesting there were/are DB connectivity or RLS issues being investigated.
