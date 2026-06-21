import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.4.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Using supabaseAdmin with service role to update profiles
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing Stripe signature header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const bodyText = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
    
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(bodyText, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message);
      return new Response(JSON.stringify({ error: `Signature verification failed: ${err.message}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Received Stripe Webhook event: ${event.type}`);

    if (event.type === 'setup_intent.succeeded') {
      const setupIntent = event.data.object as any;
      const stripeCustomerId = setupIntent.customer;
      const newPaymentMethodId = setupIntent.payment_method;

      if (stripeCustomerId && newPaymentMethodId) {
        console.log(`SetupIntent succeeded for customer: ${stripeCustomerId}. Enforcing single-card policy.`);

        // Single-card policy: make the freshly saved card the default and
        // detach every other previously saved card, so all future off-session
        // penalty charges hit this one card.
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: { default_payment_method: newPaymentMethodId },
        });

        const existing = await stripe.paymentMethods.list({
          customer: stripeCustomerId,
          type: 'card',
        });
        await Promise.all(
          existing.data
            .filter((pm) => pm.id !== newPaymentMethodId)
            .map((pm) => stripe.paymentMethods.detach(pm.id)),
        );

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ has_payment_method: true })
          .eq('stripe_customer_id', stripeCustomerId);

        if (error) throw error;
      } else if (stripeCustomerId) {
        console.log(`SetupIntent succeeded for customer: ${stripeCustomerId}. Toggling has_payment_method to true.`);
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ has_payment_method: true })
          .eq('stripe_customer_id', stripeCustomerId);

        if (error) throw error;
      }
    } else if (event.type === 'payment_method.attached') {
      const paymentMethod = event.data.object as any;
      const stripeCustomerId = paymentMethod.customer;

      if (stripeCustomerId) {
        console.log(`PaymentMethod attached for customer: ${stripeCustomerId}. Toggling has_payment_method to true.`);
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ has_payment_method: true })
          .eq('stripe_customer_id', stripeCustomerId);

        if (error) throw error;
      }
    } else if (event.type === 'payment_method.detached') {
      const paymentMethod = event.data.object as any;
      
      // Detached payloads usually have the customer ID inside event.data.object.customer or event.data.previous_attributes.customer
      const stripeCustomerId = paymentMethod.customer || 
                               (event.data.previous_attributes && event.data.previous_attributes.customer);

      if (stripeCustomerId) {
        console.log(`PaymentMethod detached for customer: ${stripeCustomerId}. Listing active card payment methods.`);
        
        // Query Stripe to see if there are other cards remaining
        const paymentMethods = await stripe.paymentMethods.list({
          customer: stripeCustomerId,
          type: 'card',
          limit: 1,
        });

        const hasRemainingCards = paymentMethods.data.length > 0;
        console.log(`Customer ${stripeCustomerId} remaining cards count: ${paymentMethods.data.length}`);

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ has_payment_method: hasRemainingCards })
          .eq('stripe_customer_id', stripeCustomerId);

        if (error) throw error;
      } else {
        console.warn(`PaymentMethod detached event did not contain a customer ID.`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error(`Fatal webhook error:`, err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
