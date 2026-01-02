-- Migration: Add deadline_date to milestones table
-- Run this in your Supabase SQL Editor

ALTER TABLE milestones 
ADD COLUMN IF NOT EXISTS deadline_date DATE;

