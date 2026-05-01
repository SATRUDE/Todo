-- Migration: Add protein goal alongside the existing calorie goal.
-- Run this AFTER migration-create-calorie-counter.sql.

-- Default protein goal in user_settings (nullable)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS default_protein_goal NUMERIC(6,1);

-- Per-day protein goal override (nullable)
ALTER TABLE calorie_day_overrides
  ADD COLUMN IF NOT EXISTS protein_goal_g NUMERIC(6,1);

-- Allow goal_calories to be null so a row can hold only a protein override
ALTER TABLE calorie_day_overrides
  ALTER COLUMN goal_calories DROP NOT NULL;
