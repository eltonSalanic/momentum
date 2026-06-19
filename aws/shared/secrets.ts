import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});

// Cache resolved secrets across warm invocations to avoid a Secrets Manager
// call on every request.
const cache = new Map<string, string>();

export async function getSecret(secretArn: string): Promise<string> {
  const cached = cache.get(secretArn);
  if (cached) return cached;

  const response = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const value = response.SecretString;
  if (!value) {
    throw new Error(`Secret ${secretArn} has no string value set. Did you run put-secret-value?`);
  }

  cache.set(secretArn, value);
  return value;
}
