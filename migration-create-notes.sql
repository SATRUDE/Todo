-- Migration: Create notes table
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
CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  task_id BIGINT REFERENCES todos(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_task_id ON notes(task_id);

-- Step 3: Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop policy if it exists
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- Step 5: Create RLS policy
CREATE POLICY "Users can manage their own notes" ON notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 6: Drop trigger if it exists
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;

-- Step 7: Create trigger (function should already exist from main schema)
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verification query (run this separately after the migration to confirm it worked):
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes';
