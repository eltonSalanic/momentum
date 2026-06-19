# stalld AWS Backend (CDK)

AWS-based backend compute for stalld. It replaces the three Supabase edge
functions while **keeping Supabase Postgres + Supabase Auth** as-is. Provisioned
with AWS CDK (TypeScript).

## What's here

```
aws/
├── bin/app.ts              # CDK entry: wires up the stacks for an env
├── lib/
│   ├── config.ts           # per-environment config (dev today)
│   ├── lambda-factory.ts   # shared NodejsFunction builder
│   ├── secrets-stack.ts    # Secrets Manager entries
│   ├── api-stack.ts        # HTTP API + JWT authorizer + 2 Stripe Lambdas
│   └── billing-stack.ts    # EventBridge -> SQS -> worker billing pipeline
├── functions/              # Lambda handlers (Node 20)
│   ├── authorizer/         # verifies Supabase JWT, forwards userId/email
│   ├── stripe-setup-intent/
│   ├── stripe-webhook/
│   ├── sweep-scheduler/    # detects misses -> enqueues SQS messages
│   └── charge-worker/      # charges one miss per message, idempotently
└── shared/                 # supabase/stripe/secrets/http helpers
```

## Architecture

```
Expo app --(Bearer access_token)--> HTTP API --> JWT authorizer --> stripe-setup-intent Lambda
Stripe   --(signed webhook)-------> HTTP API ----------------------> stripe-webhook Lambda

EventBridge (hourly) --> sweep-scheduler --> SQS charge queue --> charge-worker --> Stripe + Supabase
                                                   \--> DLQ (alarmed)
```

Lambdas talk to Supabase Postgres through the service-role key over HTTPS
(PostgREST), so there is no VPC or DB connection pooling to manage.

## CloudFormation stacks (per environment)

- `stalld-Secrets-dev`
- `stalld-Api-dev`
- `stalld-Billing-dev`

Every resource is tagged `app=stalld` and `env=dev` for cost tracking and
Resource Groups filtering.

## Prerequisites

- Node 20+, an AWS account, and AWS credentials configured (e.g. `aws configure`).
- AWS CDK bootstrap once per account/region: `npx cdk bootstrap`.

## Deploy (dev)

```bash
cd aws
npm install

# Point at your dev Supabase project (or rely on the default in lib/config.ts)
export SUPABASE_URL=https://your-dev-project-ref.supabase.co

npm run deploy:dev          # cdk deploy --all -c env=dev
```

### Set the secret values (once, after first deploy)

CDK creates the secret containers; you fill in the real values. Use **Stripe
test-mode** keys for dev:

```bash
aws secretsmanager put-secret-value \
  --secret-id /stalld/dev/stripe-secret-key \
  --secret-string 'sk_test_...'

aws secretsmanager put-secret-value \
  --secret-id /stalld/dev/supabase-service-role-key \
  --secret-string 'your-supabase-service-role-key'

# Webhook secret: created when you add the webhook endpoint in Stripe (below).
aws secretsmanager put-secret-value \
  --secret-id /stalld/dev/stripe-webhook-secret \
  --secret-string 'whsec_...'
```

## Cutover steps

1. `npm run deploy:dev` and grab the `ApiBaseUrl` output from `stalld-Api-dev`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to that URL in the app's dev env / EAS profile.
3. In the Stripe dashboard (test mode), add a webhook endpoint pointing at
   `<ApiBaseUrl>/stripe/webhook` for events `setup_intent.succeeded`,
   `payment_method.attached`, `payment_method.detached`. Put its signing secret
   into `/stalld/dev/stripe-webhook-secret`.
4. Apply the Supabase migration that adds the `charges(goal_id, missed_date)`
   unique constraint.
5. Smoke test: add a card from the app (setup-intent + webhook), and force a
   billing run by invoking the sweep Lambda:
   `aws lambda invoke --function-name <SweepSchedulerFn name> /dev/stdout`.
6. Once verified, delete the old Supabase edge functions
   (`stripe-setup-intent`, `stripe-webhook`, `charge-missed-commitments`).

## Notes

- The JWT authorizer verifies tokens against Supabase's JWKS endpoint
  (`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`). This assumes the project
  uses asymmetric JWT signing keys (the modern Supabase default). If you are on
  legacy HS256 shared-secret tokens, switch the authorizer to verify with the
  JWT secret instead.
- Production is intentionally not deployed yet. When ready, add a `prod` block to
  `lib/config.ts` and deploy with `-c env=prod` (ideally into a separate AWS
  account), pointed at a separate Supabase project and Stripe live-mode keys.
```
