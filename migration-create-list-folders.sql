-- List folders: optional grouping for lists
CREATE TABLE IF NOT EXISTS list_folders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_list_folders_user_id ON list_folders(user_id);

ALTER TABLE list_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own list folders" ON list_folders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_list_folders_updated_at
  BEFORE UPDATE ON list_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add folder_id to lists (nullable: null = no folder)
ALTER TABLE lists ADD COLUMN IF NOT EXISTS folder_id BIGINT REFERENCES list_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lists_folder_id ON lists(folder_id);
