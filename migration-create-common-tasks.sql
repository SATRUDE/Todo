-- Migration: Create common_tasks table
-- Run this in your Supabase SQL Editor
-- 
-- IMPORTANT: 
-- 1. Go to your Supabase Dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Paste this entire file content
-- 5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)
-- 6. Check for any error messages in the results panel

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS common_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  description TEXT,
  time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_common_tasks_user_id ON common_tasks(user_id);

-- Step 3: Enable Row Level Security
ALTER TABLE common_tasks ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop policy if it exists (will error if table doesn't exist, but that's ok - just continue)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can manage their own common tasks" ON common_tasks;
EXCEPTION 
  WHEN undefined_table THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- Step 5: Create RLS policy
CREATE POLICY "Users can manage their own common tasks" ON common_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 6: Drop trigger if it exists
DROP TRIGGER IF EXISTS update_common_tasks_updated_at ON common_tasks;

-- Step 7: Create trigger (function should already exist from main schema)
CREATE TRIGGER update_common_tasks_updated_at
  BEFORE UPDATE ON common_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verification query (run this separately after the migration to confirm it worked):
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'common_tasks';

