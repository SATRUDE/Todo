-- Weekly menus: Remy's drafts, reviewed in the app, published to Notion.
-- Run this in the Supabase SQL Editor once.

CREATE TABLE IF NOT EXISTS menus (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  content TEXT NOT NULL,
  -- Dormant. Added when the plan was for Remy to file the dishes and the
  -- ingredients apart; the filtering moved into the Copy sheet instead, so the
  -- whole week lives in `content` again and nothing writes this. Kept because
  -- it is already applied on the live database (see the migration of the same
  -- name); dropping it is an attended migration if it never earns its place.
  ingredients JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  notified_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own menus" ON menus
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
