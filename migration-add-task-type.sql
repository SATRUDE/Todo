-- Migration: Add type column to todos table
-- Run this in your Supabase SQL Editor
-- 
-- IMPORTANT: 
-- 1. Go to your Supabase Dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Paste this entire file content
-- 5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)
-- 6. Check for any error messages in the results panel

-- Step 1: Add type column with default value 'task'
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'task' CHECK (type IN ('task', 'reminder'));

-- Step 2: Update existing todos to have type 'task' (in case any NULL values exist)
UPDATE todos 
SET type = 'task' 
WHERE type IS NULL;

-- Step 3: Make type NOT NULL now that all rows have a value
ALTER TABLE todos 
ALTER COLUMN type SET NOT NULL;

-- Step 4: Create index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_todos_type ON todos(type);

-- Verification query (run this separately after the migration to confirm it worked):
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'todos' AND column_name = 'type';

