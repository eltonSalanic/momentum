import type { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { getStripe } from '../../shared/stripe';
import { getSupabaseAdmin } from '../../shared/supabase';
import type { ChargeMessage } from '../../shared/types';

interface ProfileBilling {
  stripe_customer_id: string | null;
  trial_ends_at: string | null;
}

// Charging half of the old `charge-missed-commitments` function. Processes one
// miss per SQS message with full idempotency:
//   1. Skip if a charge row already exists for (goal_id, missed_date).
//   2. Use a Stripe idempotency key so retries never double-charge.
//   3. The DB has a unique constraint on (goal_id, missed_date) as a final guard.
// Failed messages are retried by SQS and ultimately land in the DLQ.
export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      await processMiss(JSON.parse(record.body) as ChargeMessage);
    } catch (err) {
      console.error(`Failed to process message ${record.messageId}:`, err);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};

async function processMiss(message: ChargeMessage): Promise<void> {
  const { goalId, userId, missedDate, amountCents, title } = message;
  const supabase = await getSupabaseAdmin();

  // 1. Idempotency: already recorded a charge for this miss?
  const { data: existingCharge, error: existingError } = await supabase
    .from('charges')
    .select('id')
    .eq('goal_id', goalId)
    .eq('missed_date', missedDate)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingCharge) {
    console.log(`Charge already recorded for ${goalId} on ${missedDate}; skipping.`);
    return;
  }

  // 2. Fetch fresh billing state for the user.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id, trial_ends_at')
    .eq('id', userId)
    .single<ProfileBilling>();
  if (profileError) throw profileError;

  const now = new Date();
  const isTrial = !!profile.trial_ends_at && now < new Date(profile.trial_ends_at);

  let chargeStatus: 'succeeded' | 'failed' | 'trial_skipped' = 'failed';
  let stripeChargeId: string | null = null;

  if (isTrial) {
    chargeStatus = 'trial_skipped';
    console.log(`User ${userId} in free trial; recording penalty without charging.`);
  } else if (!profile.stripe_customer_id) {
    console.error(`User ${userId} has no stripe_customer_id; marking payment method missing.`);
    await supabase.from('profiles').update({ has_payment_method: false }).eq('id', userId);
  } else {
    const stripe = await getStripe();
    try {
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
      if (customer.deleted) throw new Error('Stripe customer is deleted.');

      let paymentMethodId = customer.invoice_settings?.default_payment_method as string | undefined;
      if (!paymentMethodId) {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: profile.stripe_customer_id,
          type: 'card',
          limit: 1,
        });
        paymentMethodId = paymentMethods.data[0]?.id;
      }
      if (!paymentMethodId) throw new Error('No default or saved card found.');

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: 'usd',
          customer: profile.stripe_customer_id,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          description: `stalld Penalty: Missed check-in for "${title}"`,
        },
        // Stripe-side dedupe: same key => same PaymentIntent, even on retries.
        { idempotencyKey: `penalty:${goalId}:${missedDate}` },
      );

      if (paymentIntent.status === 'succeeded') {
        chargeStatus = 'succeeded';
        stripeChargeId = paymentIntent.id;
        console.log(`Charged ${userId} $${(amountCents / 100).toFixed(2)} (${paymentIntent.id}).`);
      } else {
        console.warn(`PaymentIntent for ${userId} incomplete: ${paymentIntent.status}`);
      }
    } catch (stripeErr) {
      console.error(`Stripe charge failed for ${userId}:`, stripeErr);
      await supabase.from('profiles').update({ has_payment_method: false }).eq('id', userId);
    }
  }

  // 3. Record the billing outcome. Unique constraint on (goal_id, missed_date)
  // protects against a racing duplicate; treat that as already-done.
  const { error: insertError } = await supabase.from('charges').insert({
    goal_id: goalId,
    user_id: userId,
    missed_date: missedDate,
    amount_cents: amountCents,
    status: chargeStatus,
    stripe_charge_id: stripeChargeId,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      console.log(`Charge row for ${goalId} on ${missedDate} already exists (race); ok.`);
      return;
    }
    throw insertError;
  }
}
