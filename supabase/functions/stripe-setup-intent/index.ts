import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get User from Auth Header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // 2. Get Profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    let customerId = profile.stripe_customer_id;

    // Parse body for optional actions
    let action = 'create-intent';
    try {
      const body = await req.json();
      if (body && body.action) {
        action = body.action;
      }
    } catch (_) {
      // No body or simple request
    }

    if (action === 'get-payment-method') {
      if (!customerId) {
        return new Response(JSON.stringify({ card: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
        limit: 1,
      });

      if (paymentMethods.data.length > 0) {
        const card = paymentMethods.data[0].card;
        return new Response(JSON.stringify({
          card: {
            brand: card.brand,
            last4: card.last4,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } else {
        return new Response(JSON.stringify({ card: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // 3. Create Stripe Customer if not exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || undefined,
      });
      customerId = customer.id;

      // Update profile with customer ID
      await supabaseClient.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    // 4. Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        supabase_user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ clientSecret: setupIntent.client_secret }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
