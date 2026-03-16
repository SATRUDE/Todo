-- Create notebook_books table
-- Each book has an associated list (list_id) which stores its tasks
CREATE TABLE IF NOT EXISTS notebook_books (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id BIGINT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id)
);

CREATE INDEX IF NOT EXISTS idx_notebook_books_user_id ON notebook_books(user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_books_list_id ON notebook_books(list_id);

ALTER TABLE notebook_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notebook books" ON notebook_books
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_notebook_books_updated_at
  BEFORE UPDATE ON notebook_books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
