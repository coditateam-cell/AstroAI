# Implementation Plan

- [x] 1. Create backend sessions router





  - Create `backend/app/routers/sessions.py` with `GET /sessions/user/{user_id}` endpoint
  - Require `get_current_user` dependency; return 403 if JWT `sub` does not match `user_id` path param
  - Query `public.sessions` ordered by `started_at DESC` for the given user
  - Batch-query `public.session_messages` for all returned session IDs in a single `IN` query, ordered by `created_at ASC`
  - Assemble and return `{ "sessions": [...] }` with `messages` array nested per session
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
- [x] 1.1 Write unit tests for the sessions endpoint


  - Create `backend/tests/test_sessions_router.py`
  - Mock Supabase client to verify sessions query, messages batch query, and response shape
  - Test 401 when no JWT, 403 when user_id mismatch, 200 with empty array when no sessions
  - _Requirements: 3.2, 3.5_

- [x] 2. Register sessions router in FastAPI app




  - Open `backend/app/main.py` and add `include_router` call for the new sessions router at prefix `/sessions`
  - _Requirements: 3.1_

- [x] 3. Implement `SessionsSidebar` component





- [x] 3.1 Create component file with data fetching and session list


  - Create `frontend/components/SessionsSidebar.tsx` as a `'use client'` component
  - Define `Assessment`, `Message`, and `Session` TypeScript interfaces
  - Implement `useEffect` that calls `apiGet<{ sessions: Session[] }>` when `userId` is truthy
  - Manage `sessions`, `loading`, and `error` state
  - Render sidebar header, loading state, error state, empty state, and session card list
  - Each card shows formatted date, duration (`Xm Ys`), and truncated `assessment.session_summary`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3.2 Implement DetailPanel modal with tabs

  - Add `selectedSession` and `activeTab` state to `SessionsSidebar`
  - Render `AnimatePresence` + `motion.div` slide-in panel triggered by session card click
  - Implement backdrop click and close button to dismiss the panel
  - Implement "AI Assessment" tab: render `session_summary`, `key_insights`, `action_items`; show null-assessment fallback message
  - Implement "Full Transcript" tab: render chat bubbles per message role; show empty-transcript fallback message
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. Update session page layout





  - Open `frontend/app/session/page.tsx`
  - Import `useUser` hook and `SessionsSidebar` component
  - Add `user` from `useUser()` to component state
  - Wrap existing JSX in a `flex h-screen w-screen overflow-hidden bg-black` container
  - Render `<SessionsSidebar userId={user?.id ?? ''} />` as the left column
  - Wrap existing `<StarField />` + `<LiveKitRoom>` block in a `flex-1` right column div
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
