# JyotishAI

AI-powered Vedic astrology voice assistant using LiveKit + Claude + pyswisseph.

## Running locally

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
```

### Agent
```bash
cd agent
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

## Environment Variables

- `backend/.env` — Backend API keys (Supabase, LiveKit, Anthropic, ElevenLabs, Deepgram, OpenRouter, Gemini)
- `agent/.env` — Agent API keys (LiveKit, Anthropic, Deepgram, ElevenLabs, OpenRouter, Gemini)
- `frontend/.env.local` — Frontend config (Supabase, Backend URL, LiveKit URL)

## Phases

- **Phase 1**: Project scaffold & environment setup ✅
- **Phase 2**: Supabase database setup
- **Phase 3**: Onboarding flow & birth chart computation
- **Phase 4**: Authentication & user management
- **Phase 5**: Agent architecture (LiveKit voice pipeline)
- **Phase 6**: Full voice session UI
