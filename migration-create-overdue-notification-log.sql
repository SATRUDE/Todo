-- Migration: Create overdue_notification_log table
-- Tracks when we last sent a periodic "overdue items" notification to each user
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS overdue_notification_log (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE overdue_notification_log IS 'Tracks when periodic overdue reminders were last sent to each user (throttles to avoid spam)';

-- RLS enabled: no policies = only service role (API) can access (service role bypasses RLS)
ALTER TABLE overdue_notification_log ENABLE ROW LEVEL SECURITY;
