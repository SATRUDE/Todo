-- Migration: Add is_open field to focus_sessions
-- Tracks which session is currently active/open
-- Only one session can be open at a time per user

ALTER TABLE focus_sessions
ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT FALSE;

-- Create a unique partial index to ensure only one session is open per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_sessions_user_open ON focus_sessions(user_id)
WHERE is_open = TRUE;
