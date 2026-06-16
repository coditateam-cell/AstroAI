import { createClient } from '@/lib/supabase/client'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  }
}

export async function apiPost<T>(path: string, body: object): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BACKEND_URL}${path}`, { headers })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}
