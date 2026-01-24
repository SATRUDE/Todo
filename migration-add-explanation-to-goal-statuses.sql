-- Add explanation column to goal_statuses (AI-generated 2–4 sentence paragraph).
-- Persisted with status; same source as today-page score, updated when recalibrated.

alter table public.goal_statuses
  add column if not exists explanation text;
