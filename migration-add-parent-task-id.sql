-- Migration: Add parent_task_id column to todos table for subtasks
-- Run this in your Supabase SQL Editor
-- 
-- IMPORTANT: 
-- 1. Go to your Supabase Dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Paste this entire file content
-- 5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)
-- 6. Check for any error messages in the results panel

-- Step 1: Add parent_task_id column (nullable, references todos table)
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS parent_task_id BIGINT REFERENCES todos(id) ON DELETE CASCADE;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_todos_parent_task_id ON todos(parent_task_id);

-- Verification query (run this separately after the migration to confirm it worked):
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'todos' AND column_name = 'parent_task_id';
