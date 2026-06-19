#!/usr/bin/env node
import 'source-map-support/register';
import { App, Tags } from 'aws-cdk-lib';
import { getConfig } from '../lib/config';
import { resolveDeployEnv } from '../lib/deploy-env';
import { SecretsStack } from '../lib/secrets-stack';
import { ApiStack } from '../lib/api-stack';
import { BillingStack } from '../lib/billing-stack';

const app = new App();
const config = getConfig(app);
const env = resolveDeployEnv();

const secrets = new SecretsStack(app, `stalld-Secrets-${config.envName}`, {
  env,
  envName: config.envName,
});

new ApiStack(app, `stalld-Api-${config.envName}`, {
  env,
  config,
  stripeSecretKey: secrets.stripeSecretKey,
  stripeWebhookSecret: secrets.stripeWebhookSecret,
  supabaseServiceRoleKey: secrets.supabaseServiceRoleKey,
});

new BillingStack(app, `stalld-Billing-${config.envName}`, {
  env,
  config,
  stripeSecretKey: secrets.stripeSecretKey,
  supabaseServiceRoleKey: secrets.supabaseServiceRoleKey,
});

// Tag every resource for cost tracking and Resource Groups filtering.
Tags.of(app).add('app', 'stalld');
Tags.of(app).add('env', config.envName);
