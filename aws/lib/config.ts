import { App } from 'aws-cdk-lib';

export interface StalldEnvConfig {
  envName: string;
  // Public Supabase project URL for this environment (dev project for dev).
  supabaseUrl: string;
  // JWT issuer derived from the Supabase URL; used by the authorizer Lambda.
  supabaseJwtIssuer: string;
  // How often the billing sweep runs. Hourly fits the "yesterday + today past
  // a specific deadline_time" detection logic well.
  scheduleExpression: string;
}

const DEFAULTS: Record<string, Omit<StalldEnvConfig, 'supabaseJwtIssuer'>> = {
  dev: {
    envName: 'dev',
    supabaseUrl: 'https://vbaorstzcvqyytbyqayw.supabase.co',
    scheduleExpression: 'rate(1 hour)',
  },
};

export function getConfig(app: App): StalldEnvConfig {
  const envName = (app.node.tryGetContext('env') as string) ?? 'dev';
  const base = DEFAULTS[envName];
  if (!base) {
    throw new Error(
      `No configuration for env "${envName}". Add it to DEFAULTS in lib/config.ts.`,
    );
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ??
    (app.node.tryGetContext('supabaseUrl') as string) ??
    base.supabaseUrl;

  return {
    ...base,
    supabaseUrl,
    supabaseJwtIssuer: `${supabaseUrl}/auth/v1`,
  };
}
