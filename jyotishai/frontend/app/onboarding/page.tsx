'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import { useUser } from '@/lib/hooks/useUser'
import { apiPost } from '@/lib/api'
import StarField from '@/components/StarField'
import ChartPreview from '@/components/ChartPreview'

interface TimelineSlot {
  timeframe: string
  blueprint: string
  current_vibe: string | null
}

interface CategoryReport {
  past: TimelineSlot
  present: TimelineSlot
  future: TimelineSlot
}

interface DetailedReport {
  personal?: CategoryReport
  career?: CategoryReport
  love?: CategoryReport
}

interface ComputedChartData {
  chart_id: string
  full_name: string
  raw_astrology_data: {
    planets: Record<string, { sign: string; degree: number; house: number; is_retrograde: boolean }>
    houses: Record<string, { sign: string; degree: number }>
    angles: Record<string, { sign: string; degree: number }>
  }
  detailed_report?: DetailedReport
  message: string
}

export default function OnboardingPage() {
  const { user, loading: userLoading, signOut } = useUser()
  const router = useRouter()

  // Form states
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [birthCity, setBirthCity] = useState('')
  const [gender, setGender] = useState('male')

  // API interaction states
  const [loading, setLoading] = useState(false)
  const [computedChart, setComputedChart] = useState<ComputedChartData | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName || !birthDate || !birthTime || !birthCity) {
      toast.error('Please fill in all fields.')
      return
    }

    if (!user) {
      toast.error('You must be logged in to compute your chart.')
      return
    }

    setLoading(true)
    const loadToast = toast.loading('Consulting Swiss Ephemeris data...')

    try {
      const response = await apiPost<ComputedChartData>('/chart/compute', {
        full_name: fullName,
        birth_date: birthDate,
        birth_time: birthTime,
        birth_city: birthCity,
        gender: gender,
        user_id: user.id, // Included for Pydantic schema validation
      })

      toast.success('Your birth chart was successfully calculated!', { id: loadToast })
      localStorage.setItem('jyotishai_chart_id', response.chart_id)
      setComputedChart(response)
    } catch (err: any) {
      toast.error(err.message || 'Failed to compute birth chart. Please try again.', { id: loadToast })
    } finally {
      setLoading(false)
    }
  }

  const handleStartSession = () => {
    if (computedChart) {
      router.push(`/session?chart_id=${computedChart.chart_id}`)
    }
  }

  if (userLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#030308', color: '#fff' }}>
        <p style={{ fontSize: 16 }}>Loading profile...</p>
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <StarField />
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header bar */}
      <header style={{
        position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>✨</span>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '0.5px' }}>JyotishAI</span>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</span>
            <button
              onClick={signOut}
              style={{
                background: 'rgba(255, 255, 255, 0.06)', border: 'none', color: '#fff',
                padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Body content */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'center',
        padding: '24px', position: 'relative', zIndex: 10
      }}>
        <AnimatePresence mode="wait">
          {!computedChart ? (
            <motion.div
              key="form-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              style={{
                width: '100%', maxWidth: 480, background: 'var(--bg-card)',
                backdropFilter: 'blur(16px)', border: '1px solid var(--border)',
                borderRadius: 24, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                margin: 'auto'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                  Begin Your Journey
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  Enter details to compute your Western birth chart.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--purple-light)', marginBottom: 6 }}>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--purple-light)', marginBottom: 6 }}>Date of Birth</label>
                    <input
                      type="date"
                      required
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--purple-light)', marginBottom: 6 }}>Time of Birth</label>
                    <input
                      type="time"
                      required
                      value={birthTime}
                      onChange={e => setBirthTime(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--purple-light)', marginBottom: 6 }}>Birth Place (City, Country)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai, Maharashtra"
                    value={birthCity}
                    onChange={e => setBirthCity(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--purple-light)', marginBottom: 6 }}>Gender</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="male" style={{ background: '#121220' }}>Male</option>
                    <option value="female" style={{ background: '#121220' }}>Female</option>
                    <option value="other" style={{ background: '#121220' }}>Other</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: 8, padding: '14px 0', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))',
                    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(138, 99, 245, 0.3)',
                    transition: 'all 0.2s', opacity: loading ? 0.8 : 1
                  }}
                >
                  {loading ? 'Calculating Birth Chart...' : 'Generate Birth Chart'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="chart-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ width: '100%', maxWidth: '100%', display: 'flex', flex: 1 }}
            >
              <ChartPreview chart={computedChart} onStartSession={handleStartSession} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(255, 255, 255, 0.04)',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  fontFamily: "'DM Sans', sans-serif"
}
