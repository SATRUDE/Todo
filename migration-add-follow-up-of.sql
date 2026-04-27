-- Migration: Add follow_up_of column to todos for task follow-up chains
-- Run this in your Supabase SQL Editor
--
-- IMPORTANT:
-- 1. Go to your Supabase Dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Paste this entire file content
-- 5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)
-- 6. Check for any error messages in the results panel

-- Step 1: Add follow_up_of column (nullable, references todos table)
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS follow_up_of BIGINT REFERENCES todos(id) ON DELETE SET NULL;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_todos_follow_up_of ON todos(follow_up_of);

-- Verification query (run separately after migration to confirm):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'todos' AND column_name = 'follow_up_of';
