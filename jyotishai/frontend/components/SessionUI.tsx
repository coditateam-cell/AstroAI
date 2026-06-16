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
    localParticipant.setMicrophoneEnabled(!muted)
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
    initializing: 'Celeste AI is waking up…',
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
          Celeste AI
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
            Your conversation will appear here. Ask about your houses, transits, or planetary aspects.
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
