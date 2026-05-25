-- ============================================================
-- Migration: Split `goals` into `routines` and `tasks`
-- ============================================================

-- 1. CREATE ROUTINES TABLE
CREATE TABLE public.routines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  amount_cents    integer NOT NULL,
  check_in_days   boolean[] NOT NULL,
  deadline_type   text NOT NULL DEFAULT 'end_of_day',
  deadline_time   text,
  status          text NOT NULL DEFAULT 'active',
  paused_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. CREATE TASKS TABLE
CREATE TABLE public.tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  amount_cents    integer NOT NULL,
  due_date        date NOT NULL,
  checked_in      boolean NOT NULL DEFAULT false,
  deadline_type   text NOT NULL DEFAULT 'end_of_day',
  deadline_time   text,
  status          text NOT NULL DEFAULT 'active',
  paused_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. DROP ALL DEPENDENCIES ON goals BEFORE ANYTHING ELSE
--    Drop the check_ins INSERT policy that references goals
DROP POLICY IF EXISTS "Users can insert own check_ins" ON public.check_ins;
--    Drop FK constraints
ALTER TABLE public.check_ins DROP CONSTRAINT IF EXISTS check_ins_goal_id_fkey;
ALTER TABLE public.charges   DROP CONSTRAINT IF EXISTS charges_goal_id_fkey;

-- 4. MIGRATE EXISTING DATA
CREATE TEMP TABLE goal_id_map (
  old_id  uuid PRIMARY KEY,
  new_id  uuid NOT NULL,
  type    text NOT NULL
);

WITH inserted AS (
  INSERT INTO public.routines (
    user_id, title, amount_cents, check_in_days,
    deadline_type, deadline_time, status, paused_at,
    created_at, updated_at
  )
  SELECT
    user_id, title, amount_cents,
    COALESCE(check_in_days, ARRAY[false,false,false,false,false,false,false]),
    deadline_type, deadline_time, status, paused_at,
    created_at, updated_at
  FROM public.goals
  WHERE type = 'routine'
  RETURNING id, created_at
)
INSERT INTO goal_id_map (old_id, new_id, type)
SELECT g.id, i.id, 'routine'
FROM public.goals g
JOIN inserted i ON i.created_at = g.created_at
WHERE g.type = 'routine';

WITH inserted AS (
  INSERT INTO public.tasks (
    user_id, title, amount_cents, due_date, checked_in,
    deadline_type, deadline_time, status, paused_at,
    created_at, updated_at
  )
  SELECT
    g.user_id, g.title, g.amount_cents,
    COALESCE(g.due_date, CURRENT_DATE),
    EXISTS (
      SELECT 1 FROM public.check_ins ci WHERE ci.goal_id = g.id
    ),
    g.deadline_type, g.deadline_time, g.status, g.paused_at,
    g.created_at, g.updated_at
  FROM public.goals g
  WHERE g.type = 'task'
  RETURNING id, created_at
)
INSERT INTO goal_id_map (old_id, new_id, type)
SELECT g.id, i.id, 'task'
FROM public.goals g
JOIN inserted i ON i.created_at = g.created_at
WHERE g.type = 'task';

-- 5. UPDATE check_ins — remap routine rows, delete task rows
UPDATE public.check_ins ci
SET goal_id = m.new_id
FROM goal_id_map m
WHERE ci.goal_id = m.old_id
  AND m.type = 'routine';

DELETE FROM public.check_ins ci
WHERE ci.goal_id IN (
  SELECT old_id FROM goal_id_map WHERE type = 'task'
);

-- 6. UPDATE charges — remap to new IDs, drop stale orphans
DELETE FROM public.charges
WHERE goal_id NOT IN (SELECT old_id FROM goal_id_map);

UPDATE public.charges c
SET goal_id = m.new_id
FROM goal_id_map m
WHERE c.goal_id = m.old_id;

-- 7. DROP GOALS TABLE (all dependencies already removed above)
DROP TABLE public.goals;

-- 8. CREATE commitments VIEW
CREATE OR REPLACE VIEW public.commitments AS
  SELECT
    id, user_id, title,
    'routine'::text        AS type,
    amount_cents,
    check_in_days,
    NULL::date             AS due_date,
    NULL::boolean          AS checked_in,
    deadline_type, deadline_time, status, paused_at,
    created_at, updated_at
  FROM public.routines
  UNION ALL
  SELECT
    id, user_id, title,
    'task'::text           AS type,
    amount_cents,
    NULL::boolean[]        AS check_in_days,
    due_date,
    checked_in,
    deadline_type, deadline_time, status, paused_at,
    created_at, updated_at
  FROM public.tasks;

-- 9. ENABLE RLS + POLICIES ON ROUTINES
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own routines"
  ON public.routines FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own routines"
  ON public.routines FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own routines"
  ON public.routines FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own routines"
  ON public.routines FOR DELETE
  USING (user_id = auth.uid());

-- 10. ENABLE RLS + POLICIES ON TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tasks"
  ON public.tasks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (user_id = auth.uid());

-- 11. RECREATE check_ins INSERT POLICY (now references routines)
CREATE POLICY "Users can insert own check_ins"
  ON public.check_ins FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND goal_id IN (
      SELECT id FROM public.routines
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
