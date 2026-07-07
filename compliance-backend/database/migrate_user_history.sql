-- ============================================================
-- Migration: Add user_id to evaluations for per-user history
-- Run: psql -U <user> -d compliance_db -f migrate_user_history.sql
-- ============================================================

-- 1. Add user_id column (nullable so existing rows survive)
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- 2. Index for fast per-user history queries
CREATE INDEX IF NOT EXISTS idx_evaluations_user ON evaluations(user_id);
