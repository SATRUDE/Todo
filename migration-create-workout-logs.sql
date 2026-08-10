-- Migration: workout logs
--
-- Mark logs runs and gym sessions in the app; Mickey's trainer routine reads
-- them each morning. PUSH, his lifting tracker, covers resistance training
-- only, so runs, rides and walks were invisible to the trainer desk. This table
-- is that missing input.
--
-- It doubles as the queue: the app inserts, the trainer routine reads rows where
-- seen_by_trainer_at IS NULL and stamps them once it has folded them into the
-- day's brief. Nothing is deleted on read, so the app keeps the full history.
--
-- Adds:
--   * workout_logs (one row per session Mark logs)

CREATE TABLE IF NOT EXISTS workout_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('run','gym','ride','walk','swim','other')),
  duration_min INTEGER CHECK (duration_min IS NULL OR duration_min > 0),
  distance_km NUMERIC(6,2) CHECK (distance_km IS NULL OR distance_km > 0),
  effort TEXT CHECK (effort IS NULL OR effort IN ('easy','steady','hard')),
  notes TEXT,
  -- Stamped by the trainer routine once the session has been read into a brief.
  -- NULL means "not yet seen"; that is the whole queue.
  seen_by_trainer_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE workout_logs IS
  'Sessions Mark logs in the app (runs, gym, rides). The trainer routine reads rows with seen_by_trainer_at IS NULL and stamps them.';

-- The app reads a user''s recent sessions, newest first.
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date
  ON workout_logs(user_id, workout_date DESC, created_at DESC);

-- The trainer routine reads the unseen queue.
CREATE INDEX IF NOT EXISTS idx_workout_logs_unseen
  ON workout_logs(seen_by_trainer_at, workout_date)
  WHERE seen_by_trainer_at IS NULL;

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "workout_logs_owner" ON workout_logs;
EXCEPTION WHEN undefined_table THEN NULL; WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "workout_logs_owner" ON workout_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_workout_logs_updated_at ON workout_logs;
CREATE TRIGGER update_workout_logs_updated_at
  BEFORE UPDATE ON workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
