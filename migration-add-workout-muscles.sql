-- Migration: muscles worked on a logged gym session
--
-- Mark's ask: a gym session should say which muscles it hit. The values are
-- deliberately the exact group keys Mickey already counts weekly volume in
-- (assistants/gym-data/muscle_map.py in marks-magazine, MUSCLE_SECTIONS), so a
-- logged session drops straight into his 10-20 sets/muscle/week picture with no
-- translation step in between.
--
-- Adds:
--   * workout_logs.muscles (text array, NULL or empty when not a gym session)

ALTER TABLE workout_logs
  ADD COLUMN IF NOT EXISTS muscles TEXT[];

COMMENT ON COLUMN workout_logs.muscles IS
  'Muscle groups a gym session worked. Keys match muscle_map.py MUSCLE_SECTIONS in marks-magazine.';

-- Keeps the vocabulary honest, so a typo cannot quietly land a group Mickey
-- does not count. Empty arrays pass; so does NULL.
ALTER TABLE workout_logs
  ADD CONSTRAINT workout_logs_muscles_known
  CHECK (
    muscles IS NULL OR muscles <@ ARRAY[
      'chest','back','front_delts','side_delts','rear_delts','traps',
      'biceps','triceps','forearms',
      'quads','hamstrings','glutes','calves',
      'abs'
    ]::TEXT[]
  );
