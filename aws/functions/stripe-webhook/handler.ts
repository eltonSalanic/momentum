import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getStripe } from '../../shared/stripe';
import { getSupabaseAdmin } from '../../shared/supabase';
import { getSecret } from '../../shared/secrets';
import { requireEnv } from '../../shared/env';

// Port of the old `stripe-webhook` edge function. Invoked directly by Stripe,
// so it is unauthenticated and instead verifies the Stripe signature against the
// raw request body.
export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const signature = event.headers['stripe-signature'] ?? event.headers['Stripe-Signature'];
  if (!signature) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing Stripe signature header' }) };
  }

  const stripe = await getStripe();
  const webhookSecret = await getSecret(requireEnv('STRIPE_WEBHOOK_SECRET_ARN'));

  // constructEventAsync needs the exact bytes Stripe signed.
  const rawBody = event.body
    ? event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : event.body
    : '';

  let stripeEvent;
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('Webhook signature verification failed:', message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Signature verification failed: ${message}` }),
    };
  }

  console.log(`Received Stripe webhook event: ${stripeEvent.type}`);

  try {
    const supabase = await getSupabaseAdmin();

    if (stripeEvent.type === 'setup_intent.succeeded') {
      const setupIntent = stripeEvent.data.object as { customer?: string };
      if (setupIntent.customer) {
        const { error } = await supabase
          .from('profiles')
          .update({ has_payment_method: true })
          .eq('stripe_customer_id', setupIntent.customer);
        if (error) throw error;
      }
    } else if (stripeEvent.type === 'payment_method.attached') {
      const paymentMethod = stripeEvent.data.object as { customer?: string };
      if (paymentMethod.customer) {
        const { error } = await supabase
          .from('profiles')
          .update({ has_payment_method: true })
          .eq('stripe_customer_id', paymentMethod.customer);
        if (error) throw error;
      }
    } else if (stripeEvent.type === 'payment_method.detached') {
      const paymentMethod = stripeEvent.data.object as { customer?: string };
      const previous = stripeEvent.data.previous_attributes as { customer?: string } | undefined;
      const stripeCustomerId = paymentMethod.customer || previous?.customer;

      if (stripeCustomerId) {
        // Check whether any cards remain before flipping the flag off.
        const paymentMethods = await stripe.paymentMethods.list({
          customer: stripeCustomerId,
          type: 'card',
          limit: 1,
        });
        const hasRemainingCards = paymentMethods.data.length > 0;

        const { error } = await supabase
          .from('profiles')
          .update({ has_payment_method: hasRemainingCards })
          .eq('stripe_customer_id', stripeCustomerId);
        if (error) throw error;
      } else {
        console.warn('payment_method.detached event had no customer id');
      }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('Fatal webhook handler error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
