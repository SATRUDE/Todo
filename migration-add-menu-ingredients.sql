-- Remy files the week's dishes and its ingredients separately, so Mark can
-- settle the dish list first and pull the ingredients in afterwards.
--
-- One JSON object per menu row, keyed by Norwegian day name:
--   {"Mandag": "Nudler, tofu, sopp, pak choi", "Tirsdag": "Halloumi, ..."}
--
-- Written by Remy's routine when he drafts the week, and by the app's Menu
-- page when Mark removes a day's ingredients (so they can be added back).
-- Additive only: the app treats a missing column as "nothing saved".

ALTER TABLE menus ADD COLUMN IF NOT EXISTS ingredients JSONB;

COMMENT ON COLUMN menus.ingredients IS 'Ingredients per Norwegian day name, held apart from content so the dish list can be settled first';
