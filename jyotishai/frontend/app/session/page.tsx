'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from '@livekit/components-react'
import '@livekit/components-styles'
import StarField from '@/components/StarField'
import SessionUI from '@/components/SessionUI'
import SessionsSidebar from '@/components/SessionsSidebar'
import { apiPost } from '@/lib/api'
import { useUser } from '@/lib/hooks/useUser'

interface RoomCredentials {
  token: string
  room_name: string
  session_id: string
  livekit_url: string
}

export default function SessionPage() {
  const router = useRouter()
  const { user } = useUser()
  const [credentials, setCredentials] = useState<RoomCredentials | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    let chartId = params.get('chart_id')
    if (!chartId) {
      chartId = localStorage.getItem('jyotishai_chart_id')
    } else {
      localStorage.setItem('jyotishai_chart_id', chartId)
    }

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
    <div className="flex h-screen w-screen overflow-hidden bg-black">
      <SessionsSidebar userId={user?.id ?? ''} />
      <div className="flex-1 relative">
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
      </div>
    </div>
  )
}
