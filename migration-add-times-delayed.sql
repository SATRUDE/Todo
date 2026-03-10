-- Add times_delayed column to track how many times a task's deadline has been changed
ALTER TABLE todos ADD COLUMN IF NOT EXISTS times_delayed INTEGER DEFAULT 0;

-- Create index for faster queries on delayed tasks
CREATE INDEX IF NOT EXISTS idx_todos_times_delayed ON todos(times_delayed) WHERE times_delayed > 0;
