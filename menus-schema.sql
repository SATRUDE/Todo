-- Weekly menus: Remy's drafts, reviewed in the app, published to Notion.
-- Run this in the Supabase SQL Editor once.

CREATE TABLE IF NOT EXISTS menus (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  content TEXT NOT NULL,
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
