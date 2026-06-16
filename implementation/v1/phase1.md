# Phase 01 — Project Scaffold & Environment Setup

## Goal
Get the full monorepo skeleton running locally with environment variables wired up, dependencies installed, and both the frontend (Next.js) and backend (FastAPI) servers starting without errors.

---

## Folder Structure to Create

```
jyotishai/
├── frontend/                  # Next.js 14 app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Landing / redirect to /onboarding
│   │   ├── onboarding/
│   │   │   └── page.tsx       # Birth details form (empty shell)
│   │   └── session/
│   │       └── page.tsx       # Voice session screen (empty shell)
│   ├── components/            # Shared UI components
│   ├── lib/                   # API helpers, types
│   ├── public/
│   ├── .env.local
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                   # FastAPI app
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── config.py          # Settings from env vars
│   │   ├── routers/           # Empty router files (chart, token, user)
│   │   │   ├── chart.py
│   │   │   ├── token.py
│   │   │   └── user.py
│   │   ├── models/            # Pydantic models
│   │   │   └── schemas.py
│   │   └── db/
│   │       └── supabase.py    # Supabase client setup
│   ├── .env
│   ├── requirements.txt
│   └── Dockerfile             # Optional, for later deployment
│
├── agent/                     # LiveKit Python agent (separate process)
│   ├── main.py                # Agent entry point (empty shell)
│   ├── .env
│   └── requirements.txt
│
└── README.md
```

---

## Step 1 — Frontend Setup

```bash
# From project root
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd frontend
npm install @livekit/components-react @livekit/client
npm install @supabase/supabase-js
npm install axios
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_LIVEKIT_URL=wss://YOUR_LIVEKIT_PROJECT.livekit.cloud
```

### `frontend/app/layout.tsx` — root layout

```tsx
import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JyotishAI — Vedic Astrology Voice Assistant',
  description: 'Voice-chat with an AI Vedic astrologer powered by your birth chart',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={dmSans.className}>{children}</body>
    </html>
  )
}
```

### `frontend/app/page.tsx` — root redirect

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/onboarding')
}
```

### `frontend/app/onboarding/page.tsx` — empty shell

```tsx
export default function OnboardingPage() {
  return (
    <main>
      <h1>Onboarding — Phase 3 will build this</h1>
    </main>
  )
}
```

### `frontend/app/session/page.tsx` — empty shell

```tsx
export default function SessionPage() {
  return (
    <main>
      <h1>Voice Session — Phase 6 will build this</h1>
    </main>
  )
}
```

---

## Step 2 — Backend Setup

```bash
# From project root
mkdir backend && cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

pip install fastapi uvicorn[standard] python-dotenv pydantic supabase pyswisseph python-multipart httpx
pip freeze > requirements.txt
```

### `backend/.env`

```env
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key    # NOT the anon key — use service role for backend

# LiveKit
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://YOUR_LIVEKIT_PROJECT.livekit.cloud

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key

# Deepgram
DEEPGRAM_API_KEY=your_deepgram_key
```

### `backend/app/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    livekit_api_key: str
    livekit_api_secret: str
    livekit_url: str
    anthropic_api_key: str
    elevenlabs_api_key: str
    deepgram_api_key: str

    class Config:
        env_file = ".env"

settings = Settings()
```

> Install `pydantic-settings` separately: `pip install pydantic-settings`

### `backend/app/db/supabase.py`

```python
from supabase import create_client, Client
from app.config import settings

supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key
)
```

### `backend/app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chart, token, user

app = FastAPI(title="JyotishAI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chart.router, prefix="/chart", tags=["chart"])
app.include_router(token.router, prefix="/token", tags=["token"])
app.include_router(user.router, prefix="/user", tags=["user"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "JyotishAI API"}
```

### `backend/app/routers/chart.py` — stub

```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/ping")
def ping():
    return {"message": "chart router alive"}
```

Repeat the same stub pattern for `token.py` and `user.py`.

---

## Step 3 — Agent Setup

```bash
# From project root
mkdir agent && cd agent
python -m venv venv
source venv/bin/activate

pip install livekit-agents livekit-plugins-anthropic livekit-plugins-deepgram livekit-plugins-elevenlabs python-dotenv
pip freeze > requirements.txt
```

### `agent/.env`

```env
LIVEKIT_URL=wss://YOUR_LIVEKIT_PROJECT.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
ANTHROPIC_API_KEY=sk-ant-...
DEEPGRAM_API_KEY=your_deepgram_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

### `agent/main.py` — stub

```python
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def main():
    print("JyotishAI Agent — stub. Phase 5 will wire this up.")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Step 4 — Root README

```markdown
# JyotishAI

AI-powered Vedic astrology voice assistant using LiveKit + Claude + pyswisseph.

## Running locally

### Frontend
cd frontend && npm run dev        # http://localhost:3000

### Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload     # http://localhost:8000

### Agent
cd agent && source venv/bin/activate
python main.py
```

---

## ✅ Phase 01 Checklist

- [ ] Monorepo folders created (`frontend/`, `backend/`, `agent/`)
- [ ] `npm run dev` starts Next.js on port 3000 with no errors
- [ ] `uvicorn app.main:app --reload` starts FastAPI on port 8000
- [ ] `GET http://localhost:8000/health` returns `{"status": "ok"}`
- [ ] `GET http://localhost:8000/chart/ping` returns ping response
- [ ] `python agent/main.py` runs without import errors
- [ ] All `.env` files created (not committed to git — add to `.gitignore`)
- [ ] `frontend/.env.local` has Supabase URL and anon key

## What's NOT built yet
- No Supabase tables (Phase 02)
- No real chart computation (Phase 03)
- No authentication (Phase 04)
- No LiveKit voice (Phase 06)