import type {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerWithContextResult,
} from 'aws-lambda';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { requireEnv } from '../../shared/env';
import type { AuthContext } from '../../shared/types';

// Supabase issues asymmetrically-signed JWTs (the modern default) and exposes a
// JWKS endpoint under the auth issuer. We verify the access token the app sends
// against that key set, then forward the user id + email to the route handlers.
const issuer = requireEnv('SUPABASE_JWT_ISSUER'); // e.g. https://<ref>.supabase.co/auth/v1
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

const DENY: APIGatewaySimpleAuthorizerWithContextResult<AuthContext> = {
  isAuthorized: false,
  context: { userId: '', email: '' },
};

export const handler = async (
  event: APIGatewayRequestAuthorizerEventV2,
): Promise<APIGatewaySimpleAuthorizerWithContextResult<AuthContext>> => {
  try {
    const header = event.headers?.authorization ?? event.headers?.Authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : header;
    if (!token) return DENY;

    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: 'authenticated',
    });

    if (!payload.sub) return DENY;

    return {
      isAuthorized: true,
      context: {
        userId: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : '',
      },
    };
  } catch (err) {
    console.error('Authorizer rejected token:', err instanceof Error ? err.message : err);
    return DENY;
  }
};
