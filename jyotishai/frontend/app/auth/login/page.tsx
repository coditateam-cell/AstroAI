'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push('/onboarding')
    }
    setLoading(false)
  }

  const handleSignUp = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) {
      setError(error.message)
    } else {
      setError('Check your email for a confirmation link.')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>JyotishAI</h1>
      <p>Sign in to your account</p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 10 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 10 }}
      />

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button onClick={handleLogin} disabled={loading} style={{ marginRight: 8 }}>
        {loading ? 'Loading…' : 'Login'}
      </button>
      <button onClick={handleSignUp} disabled={loading}>
        Sign Up
      </button>
    </div>
  )
}
