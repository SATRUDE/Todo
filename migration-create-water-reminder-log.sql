-- Migration: Create water_reminder_log table
-- Tracks each water reminder notification sent to users (for display in the app)
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS water_reminder_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_slot TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_water_reminder_log_user_id ON water_reminder_log(user_id);
CREATE INDEX IF NOT EXISTS idx_water_reminder_log_sent_at ON water_reminder_log(sent_at);

COMMENT ON TABLE water_reminder_log IS 'Logs each water reminder push notification sent to users';

ALTER TABLE water_reminder_log ENABLE ROW LEVEL SECURITY;

-- Users can only read their own water reminder logs (for displaying in the app)
CREATE POLICY "Users can read their own water reminder logs" ON water_reminder_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (API) bypasses RLS for INSERT