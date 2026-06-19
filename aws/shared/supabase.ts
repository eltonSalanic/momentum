import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSecret } from './secrets';
import { requireEnv } from './env';

let cached: SupabaseClient | null = null;

// Service-role Supabase client. Bypasses RLS, so it is only ever used from
// trusted server-side Lambdas (never exposed to the app). Mirrors the access
// pattern the old edge functions used with the service-role key.
export async function getSupabaseAdmin(): Promise<SupabaseClient> {
  if (cached) return cached;

  const url = requireEnv('SUPABASE_URL');
  const serviceRoleKey = await getSecret(requireEnv('SUPABASE_SERVICE_ROLE_SECRET_ARN'));

  cached = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return cached;
}
