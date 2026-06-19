import Stripe from 'stripe';
import { getSecret } from './secrets';
import { requireEnv } from './env';

let cached: Stripe | null = null;

export async function getStripe(): Promise<Stripe> {
  if (cached) return cached;

  const secretKey = await getSecret(requireEnv('STRIPE_SECRET_ARN'));
  // Omit apiVersion to use the account's default pinned version.
  cached = new Stripe(secretKey);

  return cached;
}
