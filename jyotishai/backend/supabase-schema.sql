-- ============================================================
-- JyotishAI v2 — Supabase PostgreSQL Schema
-- Western Tropical Astrology only. No Vedic columns.
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- public.users
-- ============================================================
CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  email           TEXT UNIQUE,
  gender          TEXT,
  plan            TEXT DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function: keep updated_at current
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- public.birth_charts  (Western Tropical only)
-- ============================================================
CREATE TABLE public.birth_charts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Raw input
  full_name           TEXT NOT NULL,
  birth_date          DATE NOT NULL,
  birth_time          TIME NOT NULL,
  birth_city          TEXT NOT NULL,
  latitude            NUMERIC(9, 6) NOT NULL,
  longitude           NUMERIC(9, 6) NOT NULL,
  timezone            TEXT NOT NULL,

  -- Computed Western Tropical output
  raw_astrology_data  JSONB NOT NULL,
  detailed_report     JSONB NOT NULL,

  is_primary          BOOLEAN DEFAULT TRUE,
  computed_at         TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_birth_charts_user_id ON public.birth_charts(user_id);

-- ============================================================
-- public.sessions
-- ============================================================
CREATE TABLE public.sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  birth_chart_id  UUID REFERENCES public.birth_charts(id),

  livekit_room    TEXT NOT NULL UNIQUE,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'error')),

  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  duration_secs   INT DEFAULT 0,

  assessment      JSONB,
  metadata        JSONB,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_livekit_room ON public.sessions(livekit_room);

-- ============================================================
-- public.session_messages
-- ============================================================
CREATE TABLE public.session_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_messages_session_id ON public.session_messages(session_id);

-- ============================================================
-- public.usage_limits
-- ============================================================
CREATE TABLE public.usage_limits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  daily_secs_used   INT NOT NULL DEFAULT 0,
  daily_reset_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day'),

  monthly_secs_used INT NOT NULL DEFAULT 0,
  month_reset_at    TIMESTAMPTZ NOT NULL DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),

  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_limits_user_id ON public.usage_limits(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birth_charts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_limits    ENABLE ROW LEVEL SECURITY;

-- users: own row only
CREATE POLICY "users_own_row" ON public.users
  FOR ALL USING (auth.uid() = id);

-- birth_charts: own rows only
CREATE POLICY "charts_own_rows" ON public.birth_charts
  FOR ALL USING (auth.uid() = user_id);

-- sessions: own rows only
CREATE POLICY "sessions_own_rows" ON public.sessions
  FOR ALL USING (auth.uid() = user_id);

-- session_messages: via session ownership
CREATE POLICY "messages_via_session" ON public.session_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

-- usage_limits: own row only
CREATE POLICY "usage_own_row" ON public.usage_limits
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Trigger: auto-create user + usage_limits row on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  INSERT INTO public.usage_limits (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
