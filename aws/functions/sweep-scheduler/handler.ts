import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { getSupabaseAdmin } from '../../shared/supabase';
import { requireEnv } from '../../shared/env';
import type { ChargeMessage } from '../../shared/types';

const sqs = new SQSClient({});

const daysMap: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

interface CommitmentRow {
  id: string;
  user_id: string;
  title: string;
  type: 'routine' | 'task';
  amount_cents: number;
  check_in_days: boolean[] | null;
  due_date: string | null;
  checked_in: boolean | null;
  deadline_type: string;
  deadline_time: string | null;
  status: string;
}

interface ProfileRow {
  id: string;
  timezone: string | null;
}

// Detection half of the old `charge-missed-commitments` function. It finds every
// (commitment, missed date) pair that closed without a check-in and enqueues one
// SQS message per miss. Actual charging happens in the charge-worker so a single
// Stripe/network failure can't abort the whole sweep.
export const handler = async (): Promise<void> => {
  const queueUrl = requireEnv('CHARGE_QUEUE_URL');
  const supabase = await getSupabaseAdmin();

  console.log('Starting missed-commitment detection sweep...');

  const { data: commitments, error: commitmentsError } = await supabase
    .from('commitments')
    .select(
      'id, user_id, title, type, amount_cents, check_in_days, due_date, checked_in, deadline_type, deadline_time, status',
    )
    .eq('status', 'active');

  if (commitmentsError) throw commitmentsError;
  if (!commitments || commitments.length === 0) {
    console.log('No active commitments to audit.');
    return;
  }

  const { data: profiles } = await supabase.from('profiles').select('id, timezone');
  const profileMap = new Map<string, ProfileRow>((profiles ?? []).map((p: ProfileRow) => [p.id, p]));

  const now = new Date();
  let enqueued = 0;

  for (const commitment of commitments as CommitmentRow[]) {
    const profile = profileMap.get(commitment.user_id);
    if (!profile) continue;

    const timezone = profile.timezone ?? 'UTC';

    const localDateStr = formatDate(now, timezone);
    const localTimeStr = formatTime(now, timezone);
    const localDayIndex = daysMap[formatWeekday(now, timezone)];

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayDateStr = formatDate(yesterday, timezone);
    const yesterdayDayIndex = daysMap[formatWeekday(yesterday, timezone)];

    const datesToAudit: { dateStr: string; dayIndex: number }[] = [
      // Yesterday's deadlines are always fully closed by now.
      { dateStr: yesterdayDateStr, dayIndex: yesterdayDayIndex },
    ];

    // Today is only closed early if there's a specific time that has passed.
    if (
      commitment.deadline_type === 'specific_time' &&
      commitment.deadline_time &&
      localTimeStr >= commitment.deadline_time
    ) {
      datesToAudit.push({ dateStr: localDateStr, dayIndex: localDayIndex });
    }

    for (const audit of datesToAudit) {
      const wasActiveDay =
        commitment.type === 'routine'
          ? commitment.check_in_days?.[audit.dayIndex] === true
          : commitment.due_date === audit.dateStr;

      if (!wasActiveDay) continue;

      // Did they check in?
      let checkedIn = false;
      if (commitment.type === 'routine') {
        const { data: checkIn, error: checkInError } = await supabase
          .from('check_ins')
          .select('id')
          .eq('goal_id', commitment.id)
          .eq('check_in_date', audit.dateStr)
          .maybeSingle();
        if (checkInError) {
          console.error(`check_ins lookup failed for ${commitment.id}:`, checkInError);
          continue;
        }
        checkedIn = !!checkIn;
      } else {
        checkedIn = commitment.checked_in === true;
      }

      if (checkedIn) continue;

      // Already have a charge row for this miss? Skip re-enqueue. The worker also
      // re-checks this, so this is just to keep the queue quiet between runs.
      const { data: existingCharge, error: chargeError } = await supabase
        .from('charges')
        .select('id')
        .eq('goal_id', commitment.id)
        .eq('missed_date', audit.dateStr)
        .maybeSingle();
      if (chargeError) {
        console.error(`charges lookup failed for ${commitment.id}:`, chargeError);
        continue;
      }
      if (existingCharge) continue;

      const message: ChargeMessage = {
        goalId: commitment.id,
        userId: commitment.user_id,
        missedDate: audit.dateStr,
        amountCents: commitment.amount_cents,
        title: commitment.title,
      };

      await sqs.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(message),
          // Belt-and-suspenders dedupe key for observability/log correlation.
          MessageAttributes: {
            idempotencyKey: {
              DataType: 'String',
              StringValue: `${commitment.id}:${audit.dateStr}`,
            },
          },
        }),
      );
      enqueued += 1;
      console.log(`Enqueued miss: user ${commitment.user_id} "${commitment.title}" on ${audit.dateStr}`);
    }
  }

  console.log(`Sweep complete. Enqueued ${enqueued} miss(es).`);
};

function formatDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatWeekday(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(date);
}
