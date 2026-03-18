-- Migration: Add Focus Sessions feature
-- Creates focus_sessions and session_tasks tables for cross-list task grouping

-- Table: focus_sessions
-- Stores user-created focused work sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#8B5CF6',
  notes      TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own focus sessions" ON focus_sessions;
CREATE POLICY "Users can manage their own focus sessions" ON focus_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_focus_sessions_updated_at
  BEFORE UPDATE ON focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table: session_tasks
-- Join table linking focus sessions to existing todos
-- user_id is stored directly (not inferred via join) so RLS works without complex policies
CREATE TABLE IF NOT EXISTS session_tasks (
  id         BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
  task_id    BIGINT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_session_tasks_session_id ON session_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_session_tasks_task_id ON session_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_session_tasks_user_id ON session_tasks(user_id);

ALTER TABLE session_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own session tasks" ON session_tasks;
CREATE POLICY "Users can manage their own session tasks" ON session_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
