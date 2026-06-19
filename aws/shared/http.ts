import type { APIGatewayProxyResultV2 } from 'aws-lambda';

export function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function parseBody<T = Record<string, unknown>>(
  body: string | undefined,
  isBase64Encoded?: boolean,
): T | null {
  if (!body) return null;
  try {
    const raw = isBase64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
