'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiGet, apiPost } from '@/lib/api'
import { useUser } from '@/lib/hooks/useUser'
import StarField from '@/components/StarField'

interface Message {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

interface PlanetData {
  sign: string
  degree: number
  house: number
  is_retrograde: boolean
}

interface ChartData {
  id: string
  full_name: string
  raw_astrology_data: {
    planets: Record<string, PlanetData>
    houses: Record<string, { sign: string; degree: number }>
    angles: Record<string, { sign: string; degree: number }>
  }
}

interface ChatResponse {
  session_id: string
  reply: string
  messages: Message[]
}

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mars: '♂', mercury: '☿', jupiter: '♃',
  venus: '♀', saturn: '♄', uranus: '⛢', neptune: '♆', pluto: '♇',
}

const PLANET_LABELS: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury',
  jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn',
  uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
}

function ChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: userLoading } = useUser()

  const [chart, setChart] = useState<ChartData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // 1. Load Chart and initialize Session
  useEffect(() => {
    let chartId = searchParams.get('chart_id')
    if (!chartId) {
      chartId = localStorage.getItem('jyotishai_chart_id')
    }

    if (!chartId) {
      router.push('/onboarding')
      return
    }

    // Load chart details
    apiGet<ChartData>(`/chart/${chartId}`)
      .then(data => {
        setChart(data)
        // Add initial greeting from Celeste
        const firstName = data.full_name.split(' ')[0] || 'Friend'
        setMessages([
          {
            role: 'assistant',
            content: `Hello ${firstName}, I am Celeste. I have aligned myself with the placements in your birth chart. What questions do you have for me today about your life path, career mission, or love connections?`
          }
        ])
      })
      .catch(err => {
        console.error(err)
        setError('Failed to load chart details. Please try again.')
      })
  }, [router, searchParams])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !chart) return

    const userMessage = input.trim()
    setInput('')
    
    // Optimistically add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await apiPost<ChatResponse>('/chat/message', {
        chart_id: chart.id,
        message: userMessage,
        session_id: sessionId
      })

      setSessionId(res.session_id)
      setMessages(res.messages)
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'The stars seem slightly obscured at the moment. Please try sending your message again.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  if (userLoading || (!chart && !error)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12, background: '#030308', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
        <StarField />
        <div style={{ fontSize: 32 }}>🔮</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Connecting to Celeste AI...</p>
      </div>
    )
  }

  const planets = chart?.raw_astrology_data?.planets || {}
  const angles = chart?.raw_astrology_data?.angles || {}
  const otherPlanets = Object.entries(planets).filter(([key]) => key !== 'sun' && key !== 'moon')

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: '#030308' }}>
      <StarField />

      {/* Header */}
      <header style={{
        position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'rgba(3, 3, 8, 0.8)', backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>✨</span>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '0.5px' }}>JyotishAI Chat</span>
        </div>
        <button
          onClick={() => router.push('/onboarding')}
          style={{
            background: 'rgba(255, 255, 255, 0.06)', border: 'none', color: '#fff',
            padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          ← Exit Chat
        </button>
      </header>

      {/* Body Area */}
      <div style={{
        flex: 1, display: 'flex', position: 'relative', zIndex: 10, overflow: 'hidden',
        padding: '24px', gap: '24px', height: 'calc(100vh - 60px)'
      }}>
        
        {/* Left Side Panel (Birth Chart Overview) */}
        {chart && (
          <aside style={{
            flex: '0 0 320px', background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 18,
            overflowY: 'auto', backdropFilter: 'blur(16px)', maxHeight: '100%'
          }} className="hidden md:flex">
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Native
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--purple-light)' }}>{chart.full_name}</h3>
            </div>

            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                Core Signs
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Asc', value: angles.ascendant?.sign ?? '—', glyph: '↑' },
                  { label: 'Sun', value: planets.sun?.sign ?? '—', glyph: '☉' },
                  { label: 'Moon', value: planets.moon?.sign ?? '—', glyph: '☽' },
                ].map(item => (
                  <div key={item.label} style={{
                    background: 'rgba(200,184,248,0.04)', border: '0.5px solid var(--border)',
                    borderRadius: 10, padding: '8px 4px', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 14, marginBottom: 2 }}>{item.glyph}</div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{item.value}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                Planetary Positions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {otherPlanets.map(([key, data]) => {
                  const glyph = PLANET_GLYPHS[key] ?? '🪐'
                  const label = PLANET_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
                  return (
                    <div key={key} style={{
                      background: 'rgba(200,184,248,0.02)', border: '0.5px solid var(--border)',
                      borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, color: 'var(--purple-light)' }}>{glyph}</span>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {data.sign} {Math.floor(data.degree)}°
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <p style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', lineHeight: '1.4', marginTop: 'auto' }}>
              Celeste analyzes these alignments dynamically in response to your questions.
            </p>
          </aside>
        )}

        {/* Right Side: Chat Dialog */}
        <section style={{
          flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          backdropFilter: 'blur(16px)', height: '100%'
        }}>
          {/* Astrologer status header */}
          <div style={{
            padding: '16px 24px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.01)'
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: 'rgba(138, 99, 245, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid var(--border)'
            }}>
              🔮
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Celeste AI</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }}></span>
                <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>Astrologer Connection Active</span>
              </div>
            </div>
          </div>

          {/* Messages view */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16
          }}>
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user'
              return (
                <div key={index} style={{
                  display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}>
                  <div style={{
                    maxWidth: '80%', padding: '14px 18px', borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isUser ? 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))' : 'rgba(255, 255, 255, 0.03)',
                    border: isUser ? 'none' : '1px solid var(--border)',
                    boxShadow: isUser ? '0 4px 16px rgba(138, 99, 245, 0.15)' : 'none',
                  }}>
                    <p style={{
                      fontSize: 13.5, color: 'var(--text-primary)', lineHeight: '1.55',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              )
            })}
            
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                <div style={{
                  padding: '14px 18px', borderRadius: '16px 16px 16px 4px',
                  background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="animate-pulse">✨</span> Celeste is consulting the stars...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={handleSend} style={{
            padding: '16px 24px', borderTop: '1px solid var(--border)',
            background: 'rgba(3, 3, 8, 0.4)', display: 'flex', gap: 12, alignItems: 'center'
          }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask Celeste about your career potential, love alignment, or current challenges..."
              style={{
                flex: 1, padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)',
                background: 'rgba(255, 255, 255, 0.04)', color: '#fff', fontSize: 13, outline: 'none',
                fontFamily: 'DM Sans, sans-serif'
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: '14px 24px', borderRadius: 12, border: 'none',
                background: loading || !input.trim() ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, #6b4fd8, #9b59f5)',
                color: loading || !input.trim() ? 'var(--text-hint)' : '#fff',
                fontSize: 13, fontWeight: 600, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s', boxShadow: loading || !input.trim() ? 'none' : '0 4px 16px rgba(138, 99, 245, 0.2)'
              }}
            >
              Send Message
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#030308', color: '#fff' }}>
        <p>Loading session...</p>
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
}
