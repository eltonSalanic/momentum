import type {
  APIGatewayProxyEventV2WithLambdaAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getStripe } from '../../shared/stripe';
import { getSupabaseAdmin } from '../../shared/supabase';
import { json, parseBody } from '../../shared/http';
import type { AuthContext } from '../../shared/types';

// Port of the old `stripe-setup-intent` edge function. The user identity now
// comes from the API Gateway JWT authorizer instead of supabase.auth.getUser().
export const handler = async (
  event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthContext>,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const { userId, email } = event.requestContext.authorizer.lambda;
    if (!userId) return json(401, { error: 'Unauthorized' });

    const supabase = await getSupabaseAdmin();
    const stripe = await getStripe();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    let customerId: string | null = profile.stripe_customer_id;

    const body = parseBody<{ action?: string }>(event.body, event.isBase64Encoded);
    const action = body?.action ?? 'create-intent';

    if (action === 'get-payment-method') {
      if (!customerId) return json(200, { card: null });

      // Prefer the customer's default card so the UI shows the exact card that
      // penalty charges will use. Fall back to the only saved card otherwise.
      const customer = await stripe.customers.retrieve(customerId);
      const defaultPmId =
        !('deleted' in customer) && customer.invoice_settings?.default_payment_method
          ? (customer.invoice_settings.default_payment_method as string)
          : null;

      let card = null;
      if (defaultPmId) {
        const pm = await stripe.paymentMethods.retrieve(defaultPmId);
        card = pm.card ?? null;
      } else {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
          limit: 1,
        });
        card = paymentMethods.data[0]?.card ?? null;
      }

      if (!card) return json(200, { card: null });

      return json(200, {
        card: {
          brand: card.brand,
          last4: card.last4,
          exp_month: card.exp_month,
          exp_year: card.exp_year,
        },
      });
    }

    // Default action: create-intent.
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: { supabase_user_id: userId },
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || undefined,
      });
      customerId = customer.id;

      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { supabase_user_id: userId },
    });

    return json(200, { clientSecret: setupIntent.client_secret });
  } catch (err) {
    console.error('setup-intent error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json(400, { error: message });
  }
};
