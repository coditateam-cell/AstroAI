# Test Database Setup

## Step 1: Run SQL in Supabase Dashboard

1. Go to **Supabase Dashboard → SQL Editor → New Query**
2. Open `backend/supabase-schema.sql` in this project
3. Copy and run all SQL blocks one at a time

## Step 2: Update .env file

Update `backend/.env` with your Supabase credentials:

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Step 3: Run Backend and Test

```bash
cd backend
python -m uvicorn app.main:app --reload
```

Then visit: `http://localhost:8000/user/test-db`

You should see: `{"rows": [], "count": 0}`

## Step 4: Verify in Supabase Table Editor

Go to **Table Editor** and confirm all 5 tables appear:
- users
- birth_charts
- sessions
- session_messages
- usage_limits
