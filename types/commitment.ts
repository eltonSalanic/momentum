export const COMMITMENT_TYPES = {
  ROUTINE: 'routine',
  TASK: 'task',
} as const;

export type CommitmentType = typeof COMMITMENT_TYPES[keyof typeof COMMITMENT_TYPES];

export const DEADLINE_TYPES = {
  END_OF_DAY: 'end_of_day',
  SPECIFIC_TIME: 'specific_time',
} as const;

export type DeadlineType = typeof DEADLINE_TYPES[keyof typeof DEADLINE_TYPES];

export interface CommitmentFormState {
  title: string;
  type: CommitmentType;
  checkInDays: boolean[];
  dueDate: Date | null;
  amountCents: number;
  deadlineType: DeadlineType;
  deadlineTime: string;
}

/** Database row shape from the `goals` table */
export interface Commitment {
  id: string;
  user_id: string;
  title: string;
  type: CommitmentType;
  amount_cents: number;
  check_in_days: boolean[] | null;
  due_date: string | null;
  deadline_type: DeadlineType;
  deadline_time: string | null;
  status: string;
  paused_at: string | null;
  created_at: string;
  updated_at: string;
}
