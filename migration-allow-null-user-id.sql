-- Migration: Allow NULL user_id for legacy tasks and lists
-- This allows backward compatibility with data created before anonymous auth was enabled

-- Update todos RLS policy to allow NULL user_id OR matching user_id
DROP POLICY IF EXISTS "Users can manage their own todos" ON todos;
CREATE POLICY "Users can manage their own todos" ON todos
  FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Update lists RLS policy to allow NULL user_id OR matching user_id
DROP POLICY IF EXISTS "Users can manage their own lists" ON lists;
CREATE POLICY "Users can manage their own lists" ON lists
  FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

