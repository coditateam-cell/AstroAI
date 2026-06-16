# Phase 04 — Authentication (Supabase Auth)

## Goal
Add email/password authentication to the frontend and protect all backend API endpoints. By end of phase: a user can sign up, log in, stay logged in across page refreshes, and the backend validates their JWT on protected routes.

---

## Architecture

```
Frontend (Next.js)
  └── Supabase Auth client (handles signup/login/session)
      └── stores JWT in localStorage automatically
      └── sends JWT in Authorization header to FastAPI

Backend (FastAPI)
  └── Supabase JWT verification middleware
      └── extracts user_id from token
      └── injects into route handlers
```

---

## Step 1 — Supabase Auth Client (Frontend)

### Install

```bash
cd frontend
npm install @supabase/ssr @supabase/supabase-js
```

### `frontend/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `frontend/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

### `frontend/middleware.ts`

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### `frontend/lib/supabase/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from protected routes
  if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

---

## Step 2 — Auth Pages (Frontend)

### `frontend/app/auth/login/page.tsx`

```tsx
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
```

> Styling is intentionally minimal here. The full UI design comes in Phase 05.

### `frontend/app/auth/callback/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/onboarding`)
}
```

---

## Step 3 — Auth Hook (Frontend)

### `frontend/lib/hooks/useUser.ts`

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return { user, loading, signOut }
}
```

---

## Step 4 — API Helper with Auth Token (Frontend)

### `frontend/lib/api.ts`

```typescript
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
```

---

## Step 5 — JWT Verification in FastAPI

### Install

```bash
cd backend
pip install python-jose[cryptography]
```

### `backend/app/auth.py`

```python
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings

security = HTTPBearer()

# Supabase JWT secret — find this in:
# Supabase Dashboard → Settings → API → JWT Secret
SUPABASE_JWT_SECRET = settings.supabase_jwt_secret

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    Dependency that validates the Supabase JWT and returns the user payload.
    Use in any route that requires authentication.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
```

Add `supabase_jwt_secret` to `backend/.env`:

```env
SUPABASE_JWT_SECRET=your_supabase_jwt_secret   # Dashboard → Settings → API → JWT Secret
```

And to `backend/app/config.py`:

```python
supabase_jwt_secret: str
```

### Update `backend/app/routers/chart.py` to use auth

```python
from fastapi import APIRouter, HTTPException, Depends
from app.auth import get_current_user

router = APIRouter()

@router.post("/compute")
def compute_chart(req: BirthChartRequest, user=Depends(get_current_user)):
    # Use the authenticated user's ID, not the one from the request body
    user_id = user["sub"]   # Supabase puts user UUID in "sub" claim
    # ... rest of the function, use user_id instead of req.user_id
```

---

## Step 6 — Test Auth End-to-End

```bash
# 1. Go to http://localhost:3000/auth/login
# 2. Sign up with an email + password
# 3. Check Supabase Dashboard → Authentication → Users — user should appear
# 4. Log in and open browser DevTools → Application → Local Storage
#    You should see sb-*-auth-token with a JWT
# 5. Copy the access_token value
# 6. Test protected endpoint:

curl -X GET http://localhost:8000/user/test-db \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"

# Should return {"rows": [], "count": 0}
# Without the token: 403 Forbidden
```

---

## ✅ Phase 04 Checklist

- [ ] User can sign up via `/auth/login` page
- [ ] Confirmation email received (or instant login if email confirm disabled in Supabase)
- [ ] User appears in Supabase → Authentication → Users
- [ ] `public.users` row auto-created by the trigger from Phase 02
- [ ] `usage_limits` row auto-created by the trigger from Phase 02
- [ ] After login, `useUser()` hook returns the user object
- [ ] Unauthenticated access to `/onboarding` redirects to `/auth/login`
- [ ] `Authorization: Bearer <token>` header accepted by FastAPI
- [ ] Invalid/missing token returns 401
- [ ] Sign out clears the session and redirects to login

## What's NOT built yet
- No polished UI (Phase 05)
- No birth form connected to chart API (Phase 05)
- No LiveKit (Phase 06)