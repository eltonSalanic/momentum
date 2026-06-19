-- ============================================================
-- Migration: Make penalty charges idempotent
-- Adds a unique constraint on charges(goal_id, missed_date) so the AWS
-- charge-worker can never write two penalty rows for the same missed day,
-- even under retries or overlapping billing sweeps.
-- ============================================================

-- 1. Remove any pre-existing duplicates, keeping one row per (goal_id, missed_date).
--    ctid is an always-present physical row identifier, so this is safe even if
--    the table has no created_at ordering column.
DELETE FROM public.charges a
USING public.charges b
WHERE a.goal_id = b.goal_id
  AND a.missed_date = b.missed_date
  AND a.ctid > b.ctid;

-- 2. Add the unique constraint if it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'charges_goal_id_missed_date_key'
  ) THEN
    ALTER TABLE public.charges
      ADD CONSTRAINT charges_goal_id_missed_date_key UNIQUE (goal_id, missed_date);
  END IF;
END $$;
