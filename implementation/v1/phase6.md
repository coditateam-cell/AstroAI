# Phase 06 — LiveKit Token Server & Voice Session UI

## Goal
Build the voice session screen UI and wire it up to LiveKit. By end of phase: a user can click "Begin voice session", get a LiveKit room token from the backend, join the room, see microphone waveform animation, and the connection status — even before the AI agent responds (agent comes in Phase 07).

---

## Step 1 — LiveKit Token Endpoint (Backend)

### Install

```bash
cd backend
pip install livekit
pip freeze > requirements.txt
```

### `backend/app/routers/token.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from livekit import api as livekit_api
from app.config import settings
from app.auth import get_current_user
from app.db.supabase import supabase
import uuid

router = APIRouter()

class TokenRequest(BaseModel):
    chart_id: str

class TokenResponse(BaseModel):
    token: str
    room_name: str
    session_id: str
    livekit_url: str

@router.post("/generate", response_model=TokenResponse)
async def generate_token(req: TokenRequest, user=Depends(get_current_user)):
    user_id = user["sub"]
    
    # Verify the chart belongs to this user
    chart_result = supabase.table("birth_charts").select("id, user_id").eq("id", req.chart_id).execute()
    if not chart_result.data or chart_result.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Chart not found or not owned by user")
    
    # Create a unique room name for this session
    room_name = f"session_{user_id[:8]}_{uuid.uuid4().hex[:8]}"
    
    # Create a session record in Supabase
    session_result = supabase.table("sessions").insert({
        "user_id": user_id,
        "birth_chart_id": req.chart_id,
        "livekit_room": room_name,
        "status": "active"
    }).execute()
    
    session_id = session_result.data[0]["id"]
    
    # Generate LiveKit access token
    token = livekit_api.AccessToken(
        api_key=settings.livekit_api_key,
        api_secret=settings.livekit_api_secret
    )
    token.with_identity(user_id)
    token.with_name(user.get("email", "User"))
    token.with_grants(livekit_api.VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
    ))
    
    return TokenResponse(
        token=token.to_jwt(),
        room_name=room_name,
        session_id=session_id,
        livekit_url=settings.livekit_url
    )
```

---

## Step 2 — Session End Webhook (Backend)

LiveKit can call your backend when a room closes. This lets you record duration.

```python
# Add to backend/app/routers/token.py

from fastapi import Request
from datetime import datetime

@router.post("/webhook")
async def livekit_webhook(request: Request):
    """Called by LiveKit when room events happen (participant joined, room finished, etc)."""
    body = await request.json()
    
    event = body.get("event")
    room = body.get("room", {})
    room_name = room.get("name", "")
    
    if event == "room_finished":
        # Calculate duration and mark session as ended
        session_result = supabase.table("sessions")\
            .select("id, started_at")\
            .eq("livekit_room", room_name)\
            .execute()
        
        if session_result.data:
            session = session_result.data[0]
            started = datetime.fromisoformat(session["started_at"])
            duration_secs = int((datetime.now() - started).total_seconds())
            
            supabase.table("sessions").update({
                "status": "ended",
                "ended_at": datetime.now().isoformat(),
                "duration_secs": duration_secs
            }).eq("id", session["id"]).execute()
    
    return {"received": True}
```

---

## Step 3 — Voice Session Page (Frontend)

### `frontend/app/session/page.tsx`

```tsx
'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useLocalParticipant
} from '@livekit/components-react'
import '@livekit/components-styles'
import StarField from '@/components/StarField'
import { apiPost } from '@/lib/api'
import { useUser } from '@/lib/hooks/useUser'

interface RoomCredentials {
  token: string
  room_name: string
  session_id: string
  livekit_url: string
}

export default function SessionPage() {
  const { user } = useUser()
  const router = useRouter()
  const [credentials, setCredentials] = useState<RoomCredentials | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const chartId = localStorage.getItem('jyotishai_chart_id')
    if (!chartId) {
      router.push('/onboarding')
      return
    }

    apiPost<RoomCredentials>('/token/generate', { chart_id: chartId })
      .then(setCredentials)
      .catch(err => setError(err.message))
  }, [router])

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
        <div>
          <p style={{ color: '#f87171' }}>{error}</p>
          <button onClick={() => router.push('/onboarding')} style={{ marginTop: 12, color: 'var(--purple-light)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Go back
          </button>
        </div>
      </div>
    )
  }

  if (!credentials) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12, fontFamily: 'DM Sans, sans-serif' }}>
        <StarField />
        <div style={{ fontSize: 28 }}>🔮</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Connecting to your session…</p>
      </div>
    )
  }

  return (
    <>
      <StarField />
      <LiveKitRoom
        token={credentials.token}
        serverUrl={credentials.livekit_url}
        connect={true}
        audio={true}
        video={false}
        style={{ height: '100vh' }}
      >
        <RoomAudioRenderer />
        <SessionUI sessionId={credentials.session_id} />
      </LiveKitRoom>
    </>
  )
}
```

### `frontend/components/SessionUI.tsx`

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useVoiceAssistant, useLocalParticipant, BarVisualizer } from '@livekit/components-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function SessionUI({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const { state, audioTrack } = useVoiceAssistant()
  const { localParticipant } = useLocalParticipant()
  const [messages, setMessages] = useState<Message[]>([])
  const [muted, setMuted] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const toggleMute = () => {
    localParticipant.setMicrophoneEnabled(muted)
    setMuted(!muted)
  }

  const endSession = () => {
    localParticipant.setMicrophoneEnabled(false)
    localStorage.removeItem('jyotishai_chart_id')
    router.push('/onboarding')
  }

  const agentState = state ?? 'connecting'

  const statusLabels: Record<string, string> = {
    connecting: 'Connecting…',
    initializing: 'Pandit Jyotish AI is waking up…',
    listening: 'Listening…',
    thinking: 'Consulting the stars…',
    speaking: 'Speaking…',
    idle: 'Ready. Ask anything about your chart.'
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
      position: 'relative', zIndex: 1, fontFamily: "'DM Sans', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 20, left: 24, right: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--purple-light)' }}>
          ✦ Jyotish<span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>AI</span>
        </div>
        <div style={{
          background: 'rgba(74,222,128,0.1)', border: '0.5px solid rgba(74,222,128,0.3)',
          borderRadius: 20, padding: '4px 12px', fontSize: 11, color: 'var(--success)',
          display: 'flex', alignItems: 'center', gap: 5
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'blink 1.5s ease-in-out infinite' }} />
          {formatTime(elapsed)}
        </div>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          border: '1.5px solid rgba(200,184,248,0.35)',
          background: 'rgba(107,79,216,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, position: 'relative',
          boxShadow: agentState === 'speaking' ? '0 0 24px rgba(124,92,245,0.3)' : 'none',
          transition: 'box-shadow 0.4s'
        }}>
          🔮
          <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '1px solid rgba(200,184,248,0.15)', animation: 'pulse 2s ease-in-out infinite' }} />
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--purple-light)', marginTop: 12 }}>
          Pandit Jyotish AI
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {statusLabels[agentState] || agentState}
        </div>
      </div>

      {/* Waveform visualizer */}
      {audioTrack && (
        <div style={{ height: 44, width: 200, marginBottom: 20 }}>
          <BarVisualizer
            trackRef={audioTrack}
            style={{ height: '100%' }}
            barCount={16}
            options={{ minHeight: 4 }}
          />
        </div>
      )}

      {/* Chat transcript */}
      <div style={{
        width: '100%', maxWidth: 480, maxHeight: 240,
        overflowY: 'auto', marginBottom: 20,
        display: 'flex', flexDirection: 'column', gap: 8
      }}>
        {messages.length === 0 && (
          <p style={{ color: 'var(--text-hint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            Your conversation will appear here. Ask about career, relationships, health, or your current dasha period.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.6,
              background: msg.role === 'user' ? 'rgba(107,79,216,0.28)' : 'rgba(200,184,248,0.09)',
              border: `0.5px solid ${msg.role === 'user' ? 'rgba(107,79,216,0.35)' : 'rgba(200,184,248,0.15)'}`,
              color: 'var(--text-primary)'
            }}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <ControlButton onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🎙️'}
        </ControlButton>
        <ControlButton onClick={endSession} title="End session" variant="danger">
          📵
        </ControlButton>
        <ControlButton onClick={() => {}} title="Transcript">
          📄
        </ControlButton>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.06);opacity:0.3} }
      `}</style>
    </div>
  )
}

function ControlButton({
  onClick, title, children, variant
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  variant?: 'danger'
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 52, height: 52, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '0.5px solid',
        borderColor: variant === 'danger' ? 'rgba(210,40,60,0.35)' : 'rgba(200,184,248,0.22)',
        background: variant === 'danger' ? 'rgba(210,40,60,0.15)' : 'rgba(255,255,255,0.05)',
        cursor: 'pointer', fontSize: 20, transition: '0.2s'
      }}
    >
      {children}
    </button>
  )
}
```

---

## Step 3 — Test Without Agent

At this stage the LiveKit room will connect but there's no agent yet. You should see:

- ✅ Room connects (no errors in console)
- ✅ Microphone permission prompt appears
- ✅ Status shows "Connecting…" → "Ready"
- ✅ Session record created in Supabase `sessions` table
- ✅ Timer counting up
- ✅ Mute/unmute button works

---

## ✅ Phase 06 Checklist

- [ ] `POST /token/generate` returns a valid JWT and room name
- [ ] Token is rejected (403) for a chart that doesn't belong to the user
- [ ] `sessions` table row created in Supabase when token is generated
- [ ] Frontend joins LiveKit room without errors (check browser console)
- [ ] Microphone permission is requested on session page load
- [ ] Status label updates correctly (connecting → idle)
- [ ] Timer counts up from 00:00
- [ ] Mute button toggles microphone state
- [ ] "End session" navigates back to `/onboarding`
- [ ] `livekit_url` from `.env` matches the format `wss://...`

## What's NOT built yet
- No AI agent in the room (Phase 07)
- No real transcript (Phase 07)
- No usage limiting (Phase 08)