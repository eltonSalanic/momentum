import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { getSecret } from './secrets';
import { requireEnv } from './env';

let cached: SupabaseClient | null = null;

// Service-role Supabase client. Bypasses RLS, so it is only ever used from
// trusted server-side Lambdas (never exposed to the app). Mirrors the access
// pattern the old edge functions used with the service-role key.
//
// Node 20 Lambdas have no native WebSocket; supabase-js still initializes
// Realtime internally, so we provide the `ws` transport even though we only
// use PostgREST (.from()) in these handlers.
export async function getSupabaseAdmin(): Promise<SupabaseClient> {
  if (cached) return cached;

  const url = requireEnv('SUPABASE_URL');
  const serviceRoleKey = await getSecret(requireEnv('SUPABASE_SERVICE_ROLE_SECRET_ARN'));

  cached = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // ws types don't match supabase-js WebSocketLike; runtime behavior is correct.
    realtime: { transport: WebSocket as never },
  });

  return cached;
}
