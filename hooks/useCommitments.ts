import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Commitment, COMMITMENT_TYPES } from '../types/commitment';

/** Monday = 0 … Sunday = 6  (matches the Edge Function daysMap) */
const DAYS_MAP: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

interface CheckIn {
  id: string;
  goal_id: string;
  check_in_date: string;
}

export interface TodayCommitment extends Commitment {
  isCheckedIn: boolean;
  checkInId: string | null;
  isMissed: boolean;
}

/**
 * Returns today's local date string (YYYY-MM-DD) and day index (Mon=0).
 * Uses the device's local timezone, which should match the user's profile
 * timezone for correct alignment with the Edge Function.
 */
function getLocalToday(): { dateStr: string; dayIndex: number } {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const dayName = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
  }).format(now);

  return { dateStr, dayIndex: DAYS_MAP[dayName] ?? 0 };
}

export function useCommitments() {
  const { user } = useAuth();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [todayCommitments, setTodayCommitments] = useState<TodayCommitment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const { dateStr, dayIndex } = getLocalToday();

    // Fetch all commitments from the unified view (routines + tasks)
    const { data: allData, error: allError } = await supabase
      .from('commitments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('Error fetching commitments:', allError);
      setIsLoading(false);
      return;
    }

    const allCommitments = (allData ?? []) as Commitment[];
    setCommitments(allCommitments);

    // Fetch today's check-ins for routines (tasks use checked_in boolean directly)
    const { data: checkIns, error: checkInsError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', user.id)
      .eq('check_in_date', dateStr);

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
    }

    const todayCheckIns = (checkIns ?? []) as CheckIn[];
    // Maps routine_id → check_in row id (for routines only)
    const checkInMap = new Map(todayCheckIns.map((ci) => [ci.goal_id, ci.id]));

    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Filter commitments that are active and due today
    const dueToday: TodayCommitment[] = allCommitments
      .filter((c) => {
        if (c.status === 'paused') {
          return false;
        }
        if (c.type === COMMITMENT_TYPES.ROUTINE) {
          return c.check_in_days != null && c.check_in_days[dayIndex] === true;
        }
        if (c.type === COMMITMENT_TYPES.TASK) {
          // Show tasks due today or overdue (already checked-in tasks still show as completed)
          return c.due_date != null && c.due_date <= dateStr;
        }
        return false;
      })
      .map((c) => {
        // Determine isCheckedIn:
        // - Routines: look up check_in row in today's check_ins
        // - Tasks: read checked_in boolean directly from the row
        const isCheckedIn =
          c.type === COMMITMENT_TYPES.ROUTINE
            ? checkInMap.has(c.id)
            : c.checked_in === true;

        const checkInId =
          c.type === COMMITMENT_TYPES.ROUTINE
            ? (checkInMap.get(c.id) ?? null)
            : null; // Tasks don't use check_ins rows

        let isMissed = false;

        if (!isCheckedIn) {
          if (c.type === COMMITMENT_TYPES.TASK && c.due_date != null && c.due_date < dateStr) {
            // Task has a past due date and hasn't been checked in
            isMissed = true;
          } else if (c.deadline_type === 'specific_time' && c.deadline_time) {
            // Due today but specific deadline time has passed
            const [deadHour, deadMin] = c.deadline_time.split(':').map(Number);
            if (currentHour > deadHour || (currentHour === deadHour && currentMin >= deadMin)) {
              isMissed = true;
            }
          }
        }

        return {
          ...c,
          isCheckedIn,
          checkInId,
          isMissed,
        };
      });

    setTodayCommitments(dueToday);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  /**
   * Check-in to a commitment for today.
   * - Routines: inserts a row into `check_ins`
   * - Tasks: updates `tasks.checked_in = true`
   * Optimistically updates local state, then writes to Supabase.
   */
  const checkIn = useCallback(
    async (goalId: string): Promise<boolean> => {
      if (!user) return false;

      const commitment = [...commitments, ...todayCommitments].find((c) => c.id === goalId);
      if (!commitment) return false;

      const { dateStr } = getLocalToday();

      // Optimistic update
      setTodayCommitments((prev) =>
        prev.map((c) =>
          c.id === goalId ? { ...c, isCheckedIn: true, checkInId: 'optimistic' } : c
        )
      );

      if (commitment.type === COMMITMENT_TYPES.ROUTINE) {
        // Routines: insert a check_in row
        const { data, error } = await supabase
          .from('check_ins')
          .insert({
            goal_id: goalId,
            user_id: user.id,
            check_in_date: dateStr,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Check-in error (routine):', error);
          setTodayCommitments((prev) =>
            prev.map((c) =>
              c.id === goalId ? { ...c, isCheckedIn: false, checkInId: null } : c
            )
          );
          return false;
        }

        // Update with real check_in ID
        setTodayCommitments((prev) =>
          prev.map((c) =>
            c.id === goalId ? { ...c, checkInId: data.id } : c
          )
        );
        return true;
      } else {
        // Tasks: update checked_in boolean directly
        const { error } = await supabase
          .from('tasks')
          .update({ checked_in: true })
          .eq('id', goalId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Check-in error (task):', error);
          setTodayCommitments((prev) =>
            prev.map((c) =>
              c.id === goalId ? { ...c, isCheckedIn: false, checkInId: null } : c
            )
          );
          return false;
        }

        // Also sync in commitments list
        setCommitments((prev) =>
          prev.map((c) =>
            c.id === goalId && c.type === COMMITMENT_TYPES.TASK
              ? { ...c, checked_in: true }
              : c
          )
        );
        return true;
      }
    },
    [user, commitments, todayCommitments]
  );

  return {
    commitments,
    todayCommitments,
    isLoading,
    isRefreshing,
    refresh,
    checkIn,
  };
}
