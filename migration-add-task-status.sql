-- Migration: Add status column to todos table
-- Run this in your Supabase SQL Editor
--
-- IMPORTANT:
-- 1. Go to your Supabase Dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Paste this entire file content
-- 5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)
-- 6. Check for any error messages in the results panel
--
-- Note on the values: stored as 'in_progress', not 'in progress'. The value is
-- compared as a raw string in the app's filters, and the display label ("In
-- progress") lives in src/lib/taskStatus.ts.

-- Step 1: Add status column with default value 'todo'
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'waiting', 'done'));

-- Step 2: Backfill. Anything already ticked is Done, everything else is To do.
UPDATE todos
SET status = CASE WHEN completed THEN 'done' ELSE 'todo' END
WHERE status IS NULL;

-- Step 3: Make status NOT NULL now that all rows have a value
ALTER TABLE todos
ALTER COLUMN status SET NOT NULL;

-- Step 4: Create index for performance (the app filters on it)
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);

-- Verification query (run this separately after the migration to confirm it worked):
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'todos' AND column_name = 'status';

-- And to see the spread across your tasks:
-- SELECT status, count(*) FROM todos GROUP BY status ORDER BY count(*) DESC;
