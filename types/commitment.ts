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
