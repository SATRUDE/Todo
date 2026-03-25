-- Track whether a focus session is currently "open" (user is in session detail or has left it open).
-- Used for task page snapshots; default false for existing rows.

ALTER TABLE focus_sessions
  ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_open ON focus_sessions(user_id) WHERE is_open = true;
