-- Migration: Add list_id column to daily_tasks table
-- Run this in your Supabase SQL Editor
-- 
-- IMPORTANT: 
-- 1. Go to your Supabase Dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Paste this entire file content
-- 5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)
-- 6. Check for any error messages in the results panel

-- Step 1: Add list_id column (nullable, references lists table)
ALTER TABLE daily_tasks 
ADD COLUMN IF NOT EXISTS list_id BIGINT REFERENCES lists(id) ON DELETE SET NULL;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_daily_tasks_list_id ON daily_tasks(list_id);

-- Verification query (run this separately after the migration to confirm it worked):
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'daily_tasks' AND column_name = 'list_id';
