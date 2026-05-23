import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.4.0?target=deno';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const daysMap: Record<string, number> = {
  'Monday': 0,
  'Tuesday': 1,
  'Wednesday': 2,
  'Thursday': 3,
  'Friday': 4,
  'Saturday': 5,
  'Sunday': 6,
};

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 1. Authenticate Request
  // Only allow Supabase service_role key to invoke this background function
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  const stripe = new Stripe(stripeSecret, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    console.log('Initiating missed commitments charge sweep...');

    // 2. Fetch all active commitments along with user profiles
    const { data: commitments, error: queryError } = await supabaseAdmin
      .from('goals')
      .select(`
        *,
        profiles:user_id (
          timezone,
          stripe_customer_id,
          trial_ends_at
        )
      `)
      .eq('status', 'active');

    if (queryError) throw queryError;
    if (!commitments || commitments.length === 0) {
      return new Response(JSON.stringify({ message: 'No active commitments to audit.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const results = [];

    // Loop through each active commitment to see if the deadline has passed
    for (const commitment of commitments) {
      const profile = commitment.profiles;
      if (!profile) continue;

      const timezone = profile.timezone ?? 'UTC';
      const stripeCustomerId = profile.stripe_customer_id;

      // Check if user is in their active 14-day trial
      const isTrial = profile.trial_ends_at && now < new Date(profile.trial_ends_at);

      // --- TIMEZONE-AWARE CALCULATIONS ---
      
      // Local time strings for Today (D_today)
      const localDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now); // YYYY-MM-DD

      const localTimeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now); // HH:MM (24h)

      const localDayOfWeek = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
      }).format(now); // e.g. "Monday"
      const localDayIndex = daysMap[localDayOfWeek];

      // Local time strings for Yesterday (D_yesterday)
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const yesterdayDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(yesterday); // YYYY-MM-DD

      const yesterdayDayOfWeek = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
      }).format(yesterday);
      const yesterdayDayIndex = daysMap[yesterdayDayOfWeek];

      // Gather audit targets: we look at both Yesterday (closed) and Today (potentially closed if specific time)
      const datesToAudit = [];

      // 1. Audit Yesterday: yesterday's deadlines are always 100% closed now
      datesToAudit.push({
        dateStr: yesterdayDateStr,
        dayIndex: yesterdayDayIndex,
        isYesterday: true,
      });

      // 2. Audit Today: only closed if deadline_type is "specific_time" and local time is past the custom time
      if (commitment.deadline_type === 'specific_time' && commitment.deadline_time) {
        if (localTimeStr >= commitment.deadline_time) {
          datesToAudit.push({
            dateStr: localDateStr,
            dayIndex: localDayIndex,
            isYesterday: false,
          });
        }
      }

      // Check each targeted audit date
      for (const audit of datesToAudit) {
        // A. Verify if the audited date was an active commitment day
        let wasActiveDay = false;
        if (commitment.type === 'routine') {
          // If Routine: verify day selection array
          if (commitment.check_in_days && commitment.check_in_days[audit.dayIndex] === true) {
            wasActiveDay = true;
          }
        } else if (commitment.type === 'task') {
          // If Task: verify if the target date is the single due_date
          if (commitment.due_date === audit.dateStr) {
            wasActiveDay = true;
          }
        }

        if (!wasActiveDay) continue;

        // B. Check if the user successfully checked in on this date
        const { data: checkIn, error: checkInError } = await supabaseAdmin
          .from('check_ins')
          .select('id')
          .eq('goal_id', commitment.id)
          .eq('check_in_date', audit.dateStr)
          .maybeSingle();

        if (checkInError) {
          console.error(`Check-in fetch error for goal ${commitment.id}:`, checkInError);
          continue;
        }

        // C. Check if we have already processed a charge for this date (prevent double-billing!)
        const { data: chargeRecord, error: chargeError } = await supabaseAdmin
          .from('charges')
          .select('id, status')
          .eq('goal_id', commitment.id)
          .eq('missed_date', audit.dateStr)
          .maybeSingle();

        if (chargeError) {
          console.error(`Charge fetch error for goal ${commitment.id}:`, chargeError);
          continue;
        }

        // If they checked in, or we have already generated a charge record for this date, skip auditing
        if (checkIn || chargeRecord) continue;

        // --- THEY MISSED THE DEADLINE! COMMENCE CHARGING ---
        console.log(`Miss detected! User ${commitment.user_id} missed deadline on ${audit.dateStr} for "${commitment.title}"`);

        let chargeStatus = 'failed';
        let stripeChargeId = null;

        if (isTrial) {
          // Free Trial: log the penalty record, but skip actual Stripe charge
          chargeStatus = 'trial_skipped';
          console.log(`User ${commitment.user_id} is in Free Trial. Skipping Stripe Payment.`);
        } else if (!stripeCustomerId) {
          console.error(`Missing stripe_customer_id for user ${commitment.user_id}. Charging failed.`);
        } else {
          try {
            // 1. Retrieve the customer details from Stripe to find their default payment method
            const customer = await stripe.customers.retrieve(stripeCustomerId);
            if ('deleted' in customer) {
              throw new Error('Stripe customer is deleted.');
            }

            let paymentMethodId = customer.invoice_settings?.default_payment_method;

            // 2. Fallback: If no default invoice payment method, list their saved cards and use the first one
            if (!paymentMethodId) {
              const paymentMethods = await stripe.paymentMethods.list({
                customer: stripeCustomerId,
                type: 'card',
                limit: 1,
              });
              if (paymentMethods.data.length > 0) {
                paymentMethodId = paymentMethods.data[0].id;
              }
            }

            if (!paymentMethodId) {
              throw new Error('No default payment method or saved card found.');
            }

            // Trigger off-session payment charging their saved card
            const paymentIntent = await stripe.paymentIntents.create({
              amount: commitment.amount_cents,
              currency: 'usd',
              customer: stripeCustomerId,
              payment_method: paymentMethodId as string,
              off_session: true,
              confirm: true,
              description: `Momentum Penalty: Missed check-in for "${commitment.title}"`,
            });

            if (paymentIntent.status === 'succeeded') {
              chargeStatus = 'succeeded';
              stripeChargeId = paymentIntent.id;
              console.log(`Stripe Charge Succeeded: ${paymentIntent.id} for $${(commitment.amount_cents / 100).toFixed(2)}`);
            } else {
              console.warn(`Stripe Charge incomplete. Status: ${paymentIntent.status}`);
            }
          } catch (stripeErr: any) {
            console.error(`Stripe charging error for user ${commitment.user_id}:`, stripeErr.message);
          }
        }

        // D. Save billing record in the charges history table
        const { error: insertChargeError } = await supabaseAdmin
          .from('charges')
          .insert({
            goal_id: commitment.id,
            user_id: commitment.user_id,
            missed_date: audit.dateStr,
            amount_cents: commitment.amount_cents,
            status: chargeStatus,
            stripe_charge_id: stripeChargeId,
          });

        if (insertChargeError) {
          console.error(`Error saving charge record to database:`, insertChargeError);
        } else {
          results.push({
            commitmentId: commitment.id,
            title: commitment.title,
            date: audit.dateStr,
            status: chargeStatus,
            amountCents: commitment.amount_cents,
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processedPenalties: results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Fatal sweep error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
