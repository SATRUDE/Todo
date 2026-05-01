-- Migration: Calorie Counter
-- Run this in your Supabase SQL Editor.
--
-- Adds:
--   * default_calorie_goal column on user_settings (default goal per user)
--   * calorie_logs (food entries per day)
--   * calorie_day_overrides (per-day goal overrides)
--   * calorie_saved_foods (quick-add library)

-- Step 1: Default goal column on user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS default_calorie_goal INTEGER;

-- Step 2: calorie_saved_foods
CREATE TABLE IF NOT EXISTS calorie_saved_foods (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  protein_g NUMERIC(6,1),
  carbs_g NUMERIC(6,1),
  fat_g NUMERIC(6,1),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calorie_saved_foods_user
  ON calorie_saved_foods(user_id, last_used_at DESC);

ALTER TABLE calorie_saved_foods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "calorie_saved_foods_owner" ON calorie_saved_foods;
EXCEPTION WHEN undefined_table THEN NULL; WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "calorie_saved_foods_owner" ON calorie_saved_foods
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 3: calorie_logs
CREATE TABLE IF NOT EXISTS calorie_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  name TEXT,
  calories INTEGER NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  protein_g NUMERIC(6,1),
  carbs_g NUMERIC(6,1),
  fat_g NUMERIC(6,1),
  saved_food_id BIGINT REFERENCES calorie_saved_foods(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calorie_logs_user_date
  ON calorie_logs(user_id, log_date DESC);

ALTER TABLE calorie_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "calorie_logs_owner" ON calorie_logs;
EXCEPTION WHEN undefined_table THEN NULL; WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "calorie_logs_owner" ON calorie_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_calorie_logs_updated_at ON calorie_logs;
CREATE TRIGGER update_calorie_logs_updated_at
  BEFORE UPDATE ON calorie_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 4: calorie_day_overrides
CREATE TABLE IF NOT EXISTS calorie_day_overrides (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  goal_calories INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_calorie_day_overrides_user_date
  ON calorie_day_overrides(user_id, log_date DESC);

ALTER TABLE calorie_day_overrides ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "calorie_day_overrides_owner" ON calorie_day_overrides;
EXCEPTION WHEN undefined_table THEN NULL; WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "calorie_day_overrides_owner" ON calorie_day_overrides
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_calorie_day_overrides_updated_at ON calorie_day_overrides;
CREATE TRIGGER update_calorie_day_overrides_updated_at
  BEFORE UPDATE ON calorie_day_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
