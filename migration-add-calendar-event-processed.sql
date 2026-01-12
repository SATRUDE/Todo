-- Create calendar_event_processed table to track which calendar events have been processed
CREATE TABLE IF NOT EXISTS calendar_event_processed (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, calendar_event_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_calendar_event_processed_user_id ON calendar_event_processed(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_processed_event_id ON calendar_event_processed(calendar_event_id);

-- Enable RLS on calendar_event_processed table
ALTER TABLE calendar_event_processed ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for calendar_event_processed
CREATE POLICY "Users can manage their own processed calendar events" ON calendar_event_processed
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);



