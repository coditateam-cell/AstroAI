# Phase 05 — Frontend UI: Onboarding Form & Chart Preview

## Goal
Build the full birth details onboarding screen with the dark starry UI design, wire it to the `/chart/compute` API, display the computed chart summary, then redirect to the session screen. User should be able to go from login → enter birth details → see their Kundli summary → click "Start Voice Session".

---

## Dependencies

```bash
cd frontend
npm install framer-motion         # animations
npm install react-hot-toast       # toast notifications
npm install @radix-ui/react-select # accessible select dropdowns
npm install date-fns              # date formatting
```

---

## Step 1 — Global Styles & Fonts

### `frontend/app/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

:root {
  --bg-deep:     #0a0914;
  --bg-card:     rgba(255, 255, 255, 0.04);
  --bg-input:    rgba(255, 255, 255, 0.06);
  --border:      rgba(200, 184, 248, 0.18);
  --border-hover:rgba(200, 184, 248, 0.35);
  --purple-light:#c8b8f8;
  --purple-mid:  #7c5cf5;
  --purple-deep: #6b4fd8;
  --gold:        #f5c842;
  --text-primary:#e8e2f5;
  --text-muted:  #9b93c0;
  --text-hint:   #5d567a;
  --success:     #4ade80;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'DM Sans', sans-serif;
  background: var(--bg-deep);
  color: var(--text-primary);
  min-height: 100vh;
}

input, select, textarea {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  background: var(--bg-input);
  border: 0.5px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px;
  color: var(--text-primary);
  width: 100%;
  outline: none;
  transition: border-color 0.2s;
}

input:focus, select:focus {
  border-color: var(--border-hover);
}

input::placeholder {
  color: var(--text-hint);
}

select option {
  background: #1a1530;
}
```

---

## Step 2 — Star Background Component

### `frontend/components/StarField.tsx`

```tsx
'use client'
import { useEffect, useRef } from 'react'

export default function StarField() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    for (let i = 0; i < 80; i++) {
      const star = document.createElement('div')
      const size = Math.random() * 2 + 0.5
      const duration = 2 + Math.random() * 4
      const delay = Math.random() * 4

      star.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: white;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: twinkle ${duration}s ease-in-out infinite ${delay}s;
        pointer-events: none;
      `
      container.appendChild(star)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none'
      }}
    />
  )
}
```

Add to `globals.css`:
```css
@keyframes twinkle {
  0%, 100% { opacity: 0.15; }
  50%       { opacity: 0.8; }
}
```

---

## Step 3 — Onboarding Page

### `frontend/app/onboarding/page.tsx`

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import StarField from '@/components/StarField'
import ChartPreview from '@/components/ChartPreview'
import { apiPost } from '@/lib/api'
import { useUser } from '@/lib/hooks/useUser'

interface ChartResult {
  chart_id: string
  ascendant: string
  sun_sign: string
  moon_sign: string
  nakshatra: string
  nakshatra_pada: number
  current_dasha: { lord: string; end: string }
  yogas: { name: string; description: string }[]
}

const GENDER_OPTIONS = ['Male', 'Female', 'Other']

export default function OnboardingPage() {
  const { user } = useUser()
  const router = useRouter()

  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [loading, setLoading] = useState(false)
  const [chart, setChart] = useState<ChartResult | null>(null)

  const [form, setForm] = useState({
    full_name: '',
    birth_date: '',
    birth_time: '',
    birth_city: '',
    gender: 'Male',
  })

  const update = (key: string, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async () => {
    if (!form.full_name || !form.birth_date || !form.birth_time || !form.birth_city) {
      toast.error('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const result = await apiPost<ChartResult>('/chart/compute', {
        full_name: form.full_name,
        birth_date: form.birth_date,
        birth_time: form.birth_time + ':00',
        birth_city: form.birth_city,
        gender: form.gender.toLowerCase(),
        user_id: user?.id
      })
      setChart(result)
      setStep('preview')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to compute chart'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleStartSession = () => {
    if (chart) {
      localStorage.setItem('jyotishai_chart_id', chart.chart_id)
      router.push('/session')
    }
  }

  return (
    <>
      <StarField />
      <Toaster position="top-center" toastOptions={{ style: { background: '#1a1530', color: '#e8e2f5' } }} />

      <main style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        
        {/* Logo */}
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--purple-light)', marginBottom: 32, letterSpacing: 1 }}>
          ✦ Jyotish<span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>AI</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ width: '100%', maxWidth: 480, background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 20, padding: 32 }}
            >
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontStyle: 'italic', color: 'var(--purple-light)', marginBottom: 6 }}>
                Enter your birth details
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                Accurate birth time and city are essential for a precise Kundli.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Full name">
                  <input
                    type="text"
                    placeholder="e.g. Arjun Mehta"
                    value={form.full_name}
                    onChange={e => update('full_name', e.target.value)}
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Date of birth">
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={e => update('birth_date', e.target.value)}
                    />
                  </Field>
                  <Field label="Exact birth time">
                    <input
                      type="time"
                      value={form.birth_time}
                      onChange={e => update('birth_time', e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Birth city">
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, Maharashtra"
                    value={form.birth_city}
                    onChange={e => update('birth_city', e.target.value)}
                  />
                </Field>

                <Field label="Gender">
                  <div style={{ display: 'flex', gap: 8 }}>
                    {GENDER_OPTIONS.map(g => (
                      <button
                        key={g}
                        onClick={() => update('gender', g)}
                        style={{
                          flex: 1, padding: '9px 0', borderRadius: 10, border: '0.5px solid',
                          borderColor: form.gender === g ? 'var(--purple-mid)' : 'var(--border)',
                          background: form.gender === g ? 'rgba(124,92,245,0.2)' : 'var(--bg-input)',
                          color: form.gender === g ? 'var(--text-primary)' : 'var(--text-muted)',
                          fontSize: 13, cursor: 'pointer', transition: '0.2s'
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  marginTop: 24, width: '100%', padding: '14px 0', borderRadius: 12,
                  border: 'none', background: 'linear-gradient(135deg, #6b4fd8, #9b59f5)',
                  color: '#fff', fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3
                }}
              >
                {loading ? '✦ Computing your Kundli…' : '✦ Compute my birth chart'}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ width: '100%', maxWidth: 480 }}
            >
              {chart && <ChartPreview chart={chart} onStartSession={handleStartSession} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
```

---

## Step 4 — Chart Preview Component

### `frontend/components/ChartPreview.tsx`

```tsx
'use client'

interface ChartPreviewProps {
  chart: {
    ascendant: string
    sun_sign: string
    moon_sign: string
    nakshatra: string
    nakshatra_pada: number
    current_dasha: { lord: string; end: string }
    yogas: { name: string; description: string }[]
  }
  onStartSession: () => void
}

const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃',
  Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋'
}

export default function ChartPreview({ chart, onStartSession }: ChartPreviewProps) {
  const dashaEnd = new Date(chart.current_dasha.end).getFullYear()

  return (
    <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 20, padding: 28 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🔮</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--purple-light)', fontStyle: 'italic' }}>
          Your Kundli is ready
        </h2>
      </div>

      {/* Core signs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Ascendant (Lagna)', value: chart.ascendant, glyph: '↑' },
          { label: 'Sun sign (Rashi)', value: chart.sun_sign, glyph: '☉' },
          { label: 'Moon sign', value: chart.moon_sign, glyph: '☽' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'rgba(200,184,248,0.06)', border: '0.5px solid var(--border)',
            borderRadius: 12, padding: '12px 10px', textAlign: 'center'
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{item.glyph}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Nakshatra + Dasha */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <InfoRow label="Birth nakshatra" value={`${chart.nakshatra} (Pada ${chart.nakshatra_pada})`} />
        <InfoRow label="Current mahadasha" value={`${chart.current_dasha.lord} until ${dashaEnd}`} />
      </div>

      {/* Yogas */}
      {chart.yogas.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
            Yogas detected
          </div>
          {chart.yogas.map(yoga => (
            <div key={yoga.name} style={{
              background: 'rgba(245,200,66,0.07)', border: '0.5px solid rgba(245,200,66,0.2)',
              borderRadius: 10, padding: '10px 12px', marginBottom: 8
            }}>
              <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 500 }}>✦ {yoga.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{yoga.description}</div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onStartSession}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #6b4fd8, #9b59f5)',
          color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif"
        }}
      >
        🎙 Begin voice session with Pandit Jyotish AI
      </button>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(200,184,248,0.04)', border: '0.5px solid var(--border)',
      borderRadius: 10, padding: '10px 12px'
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
    </div>
  )
}
```

---

## ✅ Phase 05 Checklist

- [ ] Star field animation visible on the onboarding page background
- [ ] Birth details form renders correctly with all fields
- [ ] Gender toggle works (active state highlights selected option)
- [ ] Submitting the form calls `POST /chart/compute` on the backend
- [ ] Loading state shows while API call is in progress
- [ ] On success: chart preview appears with ascendant, sun sign, moon sign
- [ ] Nakshatra and mahadasha lord shown correctly
- [ ] Detected yogas shown (or section hidden if none found)
- [ ] "Begin voice session" button stores `chart_id` in localStorage and navigates to `/session`
- [ ] Error toast shown if API call fails (e.g. unknown city)
- [ ] Page redirects to `/auth/login` if user is not authenticated

## What's NOT built yet
- No voice session UI (Phase 06)
- No LiveKit room connection (Phase 07)
- No AI agent (Phase 07)