-- Migration script for Google Calendar Integration
-- Run this in your Supabase SQL Editor

-- Step 1: Add user_id columns to existing tables (if they don't exist)
-- Note: This will set user_id to NULL for existing rows. You may want to handle existing data separately.

-- Add user_id to lists table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lists' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE lists ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id to todos table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE todos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id to push_subscriptions table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'push_subscriptions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE push_subscriptions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 2: Create indexes for user_id columns
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Step 3: Update RLS policies to use user_id
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow all operations on lists" ON lists;
DROP POLICY IF EXISTS "Allow all operations on todos" ON todos;
DROP POLICY IF EXISTS "Allow all operations on push_subscriptions" ON push_subscriptions;

-- Create new user-based policies
CREATE POLICY "Users can manage their own lists" ON lists
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own todos" ON todos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 4: Create calendar_connections table
CREATE TABLE IF NOT EXISTS calendar_connections (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  calendar_id TEXT DEFAULT 'primary',
  calendar_name TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Step 5: Create calendar_sync_status table
CREATE TABLE IF NOT EXISTS calendar_sync_status (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id BIGINT REFERENCES todos(id) ON DELETE CASCADE,
  calendar_event_id TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

-- Step 6: Create indexes for calendar tables
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_status_user_id ON calendar_sync_status(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_status_task_id ON calendar_sync_status(task_id);

-- Step 7: Enable RLS on calendar tables
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_status ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for calendar tables
CREATE POLICY "Users can manage their own calendar connections" ON calendar_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own calendar sync status" ON calendar_sync_status
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 9: Create or update the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create trigger for calendar_connections updated_at
DROP TRIGGER IF EXISTS update_calendar_connections_updated_at ON calendar_connections;
CREATE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Enable anonymous authentication (if not already enabled)
-- Note: You need to enable this in Supabase Dashboard > Authentication > Providers > Anonymous
-- This SQL just ensures the auth.users table exists and is ready

-- IMPORTANT: Handling Existing Data
-- 
-- If you have existing todos/lists/push_subscriptions, they will have NULL user_id after migration.
-- Due to RLS policies, this data will be inaccessible to users.
--
-- Options:
-- 1. Start fresh: Let existing data remain inaccessible (recommended for new multi-user setup)
--    - New users will automatically get anonymous auth accounts
--    - Each user will have their own isolated data
--
-- 2. If you need to preserve existing data, you can temporarily allow NULL user_id access:
--    Run this BEFORE the new policies (between Step 2 and Step 3):
--
--    CREATE POLICY "Allow access to legacy data (temporary)" ON todos
--      FOR ALL USING (user_id IS NULL OR auth.uid() = user_id)
--      WITH CHECK (auth.uid() = user_id);
--    
--    CREATE POLICY "Allow access to legacy data (temporary)" ON lists
--      FOR ALL USING (user_id IS NULL OR auth.uid() = user_id)
--      WITH CHECK (auth.uid() = user_id);
--
--    Then manually assign user_id values later, or delete the temporary policies once
--    you've migrated the data.

-- Verification queries (optional - run these to verify the migration)
-- SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('lists', 'todos', 'push_subscriptions', 'calendar_connections', 'calendar_sync_status') ORDER BY table_name, column_name;
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

