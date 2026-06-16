# Supabase & Backend Connection Investigation Report

We investigated the project workspace for issues related to Supabase and API communication. Below is a detailed breakdown of the two main issues discovered and the steps taken to resolve them.

---

## 1. Frontend Environment Variable Naming Issue

### 🔍 Discovery
In `jyotishai/frontend/lib/supabase.ts` (and standard Supabase browser clients), the code references:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
```
However, in the frontend's configuration file `jyotishai/frontend/.env.local`, the variable was defined as:
```env
SUPABASE_URL=https://uiqlwyfjcxbhhifaazpc.supabase.co
```
Next.js only exposes environment variables to the browser context if they are prefixed with `NEXT_PUBLIC_`. Since `SUPABASE_URL` lacked this prefix, the client-side code received `undefined` and threw a `"Missing Supabase environment variables"` error at runtime.

### 🛠️ Resolution
Modified `jyotishai/frontend/.env.local` to rename `SUPABASE_URL` to `NEXT_PUBLIC_SUPABASE_URL`.
```diff
-SUPABASE_URL=https://uiqlwyfjcxbhhifaazpc.supabase.co
+NEXT_PUBLIC_SUPABASE_ANON_KEY=...
+NEXT_PUBLIC_SUPABASE_URL=https://uiqlwyfjcxbhhifaazpc.supabase.co
```

---

## 2. Backend Port Conflict (Port 8000)

### 🔍 Discovery
The FastAPI backend server is configured to run on port `8000`. However, checking active TCP listeners on the system revealed that port `8000` was already occupied by a Docker container (`com.docker.backend.exe` running the Voice Agent Interview project). 

When querying the API at `localhost:8000`, requests were resolved to the Docker container, leading to:
- `{"status":"ok","version":"0.1.0"}` responses from the other project's health check.
- `404 Not Found` errors when attempting to query endpoints unique to JyotishAI (such as `/user/test-db`).

### 🛠️ Resolution
1. Changed `NEXT_PUBLIC_BACKEND_URL` in `jyotishai/frontend/.env.local` to use port `8001` (which was verified to be open and free):
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
   ```
2. Restarted the FastAPI development server to listen on port `8001`:
   ```bash
   venv\Scripts\python.exe -m uvicorn app.main:app --port 8001 --reload
   ```

---

## 3. Verification & Testing Results

We executed test scripts to verify the updates.

### Backend to Supabase Direct Queries
Verified that the database configuration correctly links to Supabase. Hitting the `/user/test-db` endpoint on port `8001` successfully returns:
```json
{"rows":[],"count":0}
```
*(No exceptions or connection issues are present, confirming that credentials and SSL handshakes are healthy.)*

### Frontend Compilation & Middleware
- Ran type checks (`tsc --noEmit`) and a production build (`npm run build`) on the Next.js frontend; both compiled with 0 errors.
- Verified in the browser that unauthenticated traffic navigating to protected routes (like `/onboarding`) is successfully intercepted by the Supabase SSR middleware and redirected to `/auth/login`.

---

## 🚀 Running the Project

To run both services side-by-side:

### Backend
Navigate to `jyotishai/backend` and run:
```bash
venv\Scripts\python.exe -m uvicorn app.main:app --port 8001 --reload
```

### Frontend
Navigate to `jyotishai/frontend` and run:
```bash
npm run dev
```
*(The dev server will boot up on `http://localhost:3000`.)*
