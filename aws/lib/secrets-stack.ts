import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

export interface SecretsStackProps extends StackProps {
  envName: string;
}

// Owns the three secrets the compute Lambdas need. CDK creates the secret
// containers (so they are tracked in CloudFormation); the real values are set
// after deploy with `aws secretsmanager put-secret-value` (see README).
export class SecretsStack extends Stack {
  public readonly stripeSecretKey: Secret;
  public readonly stripeWebhookSecret: Secret;
  public readonly supabaseServiceRoleKey: Secret;

  constructor(scope: Construct, id: string, props: SecretsStackProps) {
    super(scope, id, props);

    const prefix = `/stalld/${props.envName}`;

    this.stripeSecretKey = new Secret(this, 'StripeSecretKey', {
      secretName: `${prefix}/stripe-secret-key`,
      description: 'Stripe secret API key (set with put-secret-value after deploy).',
    });

    this.stripeWebhookSecret = new Secret(this, 'StripeWebhookSecret', {
      secretName: `${prefix}/stripe-webhook-secret`,
      description: 'Stripe webhook signing secret (set after creating the webhook endpoint).',
    });

    this.supabaseServiceRoleKey = new Secret(this, 'SupabaseServiceRoleKey', {
      secretName: `${prefix}/supabase-service-role-key`,
      description: 'Supabase service-role key (set with put-secret-value after deploy).',
    });

    new CfnOutput(this, 'StripeSecretKeyArn', { value: this.stripeSecretKey.secretArn });
    new CfnOutput(this, 'StripeWebhookSecretArn', { value: this.stripeWebhookSecret.secretArn });
    new CfnOutput(this, 'SupabaseServiceRoleKeyArn', {
      value: this.supabaseServiceRoleKey.secretArn,
    });
  }
}
