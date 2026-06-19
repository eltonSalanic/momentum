import { supabase } from './supabase';

// Base URL of the AWS HTTP API (set per build via EAS profile / .env).
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * POST to the stalld AWS API, attaching the current Supabase access token so the
 * API Gateway JWT authorizer can identify the user. Throws on non-2xx responses.
 */
export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = (data && (data.error as string)) || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export const api = { post: apiPost };
