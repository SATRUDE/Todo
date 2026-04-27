CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_instructions TEXT NOT NULL DEFAULT ''
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_owner" ON user_settings
  FOR ALL USING (user_id = auth.uid());
