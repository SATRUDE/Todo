-- AI agent: add ai_status column to todos and create task_comments table

ALTER TABLE todos
ADD COLUMN IF NOT EXISTS ai_status TEXT;

CREATE TABLE IF NOT EXISTS task_comments (
  id BIGSERIAL PRIMARY KEY,
  todo_id BIGINT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  author TEXT NOT NULL DEFAULT 'ai',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_todo_id ON task_comments(todo_id);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_comments_owner" ON task_comments
  FOR ALL
  USING (
    todo_id IN (
      SELECT id FROM todos WHERE user_id = auth.uid()::text
    )
  );
