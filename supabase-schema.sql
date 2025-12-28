-- Create lists table
CREATE TABLE IF NOT EXISTS lists (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  time TEXT,
  "group" TEXT,
  list_id INTEGER DEFAULT 0, -- 0 for today, -1 for completed, positive for custom lists
  deadline_date DATE,
  deadline_time TEXT,
  deadline_recurring TEXT, -- 'daily', 'weekly', 'weekday', 'monthly'
  deadline_notified_at TIMESTAMP WITH TIME ZONE, -- Track when notification was sent for this deadline
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on list_id for faster queries
CREATE INDEX IF NOT EXISTS idx_todos_list_id ON todos(list_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_deadline_date ON todos(deadline_date);
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on endpoint for fast lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Enable Row Level Security (RLS)
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies that filter by user_id for multi-user support
-- Users can only see and modify their own data

-- Lists policies
DROP POLICY IF EXISTS "Allow all operations on lists" ON lists;
CREATE POLICY "Users can manage their own lists" ON lists
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Todos policies
DROP POLICY IF EXISTS "Allow all operations on todos" ON todos;
CREATE POLICY "Users can manage their own todos" ON todos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Push subscriptions policies
DROP POLICY IF EXISTS "Allow all operations on push_subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create calendar_connections table for Google Calendar OAuth tokens
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

-- Create calendar_sync_status table to track synced tasks
CREATE TABLE IF NOT EXISTS calendar_sync_status (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id BIGINT REFERENCES todos(id) ON DELETE CASCADE,
  calendar_event_id TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

-- Create calendar_event_processed table to track which calendar events have been processed
CREATE TABLE IF NOT EXISTS calendar_event_processed (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, calendar_event_id)
);

-- Create indexes for calendar tables
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_status_user_id ON calendar_sync_status(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_status_task_id ON calendar_sync_status(task_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_processed_user_id ON calendar_event_processed(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_processed_event_id ON calendar_event_processed(calendar_event_id);

-- Enable RLS on calendar tables
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_processed ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calendar tables
CREATE POLICY "Users can manage their own calendar connections" ON calendar_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own calendar sync status" ON calendar_sync_status
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own processed calendar events" ON calendar_event_processed
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to update updated_at for calendar_connections
CREATE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

