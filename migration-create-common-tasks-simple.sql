-- SIMPLE VERSION: Run these commands ONE AT A TIME in Supabase SQL Editor
-- If any command fails, check the error message and let me know

-- Command 1: Create the table
CREATE TABLE IF NOT EXISTS common_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  description TEXT,
  time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Command 2: Create index
CREATE INDEX IF NOT EXISTS idx_common_tasks_user_id ON common_tasks(user_id);

-- Command 3: Enable RLS
ALTER TABLE common_tasks ENABLE ROW LEVEL SECURITY;

-- Command 4: Create policy
CREATE POLICY "Users can manage their own common tasks" ON common_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Command 5: Create trigger
CREATE TRIGGER update_common_tasks_updated_at
  BEFORE UPDATE ON common_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();



