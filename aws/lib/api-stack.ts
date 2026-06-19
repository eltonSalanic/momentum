import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HttpApi, HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import {
  HttpLambdaAuthorizer,
  HttpLambdaResponseType,
} from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StalldEnvConfig } from './config';
import { createFunction } from './lambda-factory';

export interface ApiStackProps extends StackProps {
  config: StalldEnvConfig;
  stripeSecretKey: Secret;
  stripeWebhookSecret: Secret;
  supabaseServiceRoleKey: Secret;
}

// HTTP API fronting the two Stripe Lambdas:
//   POST /stripe/setup-intent  -> behind the Supabase JWT authorizer
//   POST /stripe/webhook       -> public, verifies the Stripe signature
export class ApiStack extends Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { config } = props;

    const authFn = createFunction(this, 'AuthorizerFn', {
      entry: 'authorizer/handler.ts',
      environment: { SUPABASE_JWT_ISSUER: config.supabaseJwtIssuer },
      timeout: Duration.seconds(10),
    });

    const authorizer = new HttpLambdaAuthorizer('SupabaseAuthorizer', authFn, {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
      identitySource: ['$request.header.Authorization'],
      resultsCacheTtl: Duration.minutes(5),
    });

    const setupIntentFn = createFunction(this, 'StripeSetupIntentFn', {
      entry: 'stripe-setup-intent/handler.ts',
      environment: {
        SUPABASE_URL: config.supabaseUrl,
        SUPABASE_SERVICE_ROLE_SECRET_ARN: props.supabaseServiceRoleKey.secretArn,
        STRIPE_SECRET_ARN: props.stripeSecretKey.secretArn,
      },
    });
    props.supabaseServiceRoleKey.grantRead(setupIntentFn);
    props.stripeSecretKey.grantRead(setupIntentFn);

    const webhookFn = createFunction(this, 'StripeWebhookFn', {
      entry: 'stripe-webhook/handler.ts',
      environment: {
        SUPABASE_URL: config.supabaseUrl,
        SUPABASE_SERVICE_ROLE_SECRET_ARN: props.supabaseServiceRoleKey.secretArn,
        STRIPE_SECRET_ARN: props.stripeSecretKey.secretArn,
        STRIPE_WEBHOOK_SECRET_ARN: props.stripeWebhookSecret.secretArn,
      },
    });
    props.supabaseServiceRoleKey.grantRead(webhookFn);
    props.stripeSecretKey.grantRead(webhookFn);
    props.stripeWebhookSecret.grantRead(webhookFn);

    const httpApi = new HttpApi(this, 'HttpApi', {
      apiName: `stalld-${config.envName}`,
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.OPTIONS],
        allowHeaders: ['authorization', 'content-type'],
      },
    });

    httpApi.addRoutes({
      path: '/stripe/setup-intent',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('SetupIntentIntegration', setupIntentFn),
      authorizer,
    });

    httpApi.addRoutes({
      path: '/stripe/webhook',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('WebhookIntegration', webhookFn),
    });

    this.apiUrl = httpApi.apiEndpoint;

    new CfnOutput(this, 'ApiBaseUrl', {
      value: httpApi.apiEndpoint,
      description: 'Set EXPO_PUBLIC_API_BASE_URL to this. Stripe webhook URL is <this>/stripe/webhook',
    });
  }
}
