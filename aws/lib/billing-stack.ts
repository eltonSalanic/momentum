import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import {
  ComparisonOperator,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StalldEnvConfig } from './config';
import { createFunction } from './lambda-factory';

export interface BillingStackProps extends StackProps {
  config: StalldEnvConfig;
  stripeSecretKey: Secret;
  supabaseServiceRoleKey: Secret;
}

// Durable billing pipeline:
//   EventBridge rule (cron) -> sweep-scheduler -> SQS charge queue -> charge-worker
//   failures -> DLQ, with CloudWatch alarms on the DLQ and on Lambda errors.
export class BillingStack extends Stack {
  constructor(scope: Construct, id: string, props: BillingStackProps) {
    super(scope, id, props);

    const { config } = props;

    const deadLetterQueue = new Queue(this, 'ChargeDLQ', {
      queueName: `stalld-${config.envName}-charge-dlq`,
      retentionPeriod: Duration.days(14),
    });

    const chargeQueue = new Queue(this, 'ChargeQueue', {
      queueName: `stalld-${config.envName}-charge-queue`,
      // Comfortably larger than the worker timeout so in-flight messages aren't
      // re-delivered while still processing.
      visibilityTimeout: Duration.seconds(180),
      deadLetterQueue: { queue: deadLetterQueue, maxReceiveCount: 5 },
    });

    const schedulerFn = createFunction(this, 'SweepSchedulerFn', {
      entry: 'sweep-scheduler/handler.ts',
      environment: {
        SUPABASE_URL: config.supabaseUrl,
        SUPABASE_SERVICE_ROLE_SECRET_ARN: props.supabaseServiceRoleKey.secretArn,
        CHARGE_QUEUE_URL: chargeQueue.queueUrl,
      },
      timeout: Duration.seconds(120),
      memorySize: 512,
    });
    props.supabaseServiceRoleKey.grantRead(schedulerFn);
    chargeQueue.grantSendMessages(schedulerFn);

    new Rule(this, 'SweepSchedule', {
      ruleName: `stalld-${config.envName}-billing-sweep`,
      schedule: Schedule.expression(config.scheduleExpression),
      targets: [new LambdaFunction(schedulerFn)],
    });

    const workerFn = createFunction(this, 'ChargeWorkerFn', {
      entry: 'charge-worker/handler.ts',
      environment: {
        SUPABASE_URL: config.supabaseUrl,
        SUPABASE_SERVICE_ROLE_SECRET_ARN: props.supabaseServiceRoleKey.secretArn,
        STRIPE_SECRET_ARN: props.stripeSecretKey.secretArn,
      },
      timeout: Duration.seconds(30),
    });
    props.supabaseServiceRoleKey.grantRead(workerFn);
    props.stripeSecretKey.grantRead(workerFn);
    workerFn.addEventSource(
      new SqsEventSource(chargeQueue, {
        batchSize: 5,
        reportBatchItemFailures: true,
      }),
    );

    // --- Observability ---
    deadLetterQueue
      .metricApproximateNumberOfMessagesVisible()
      .createAlarm(this, 'ChargeDLQAlarm', {
        alarmName: `stalld-${config.envName}-charge-dlq-not-empty`,
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      });

    workerFn.metricErrors().createAlarm(this, 'ChargeWorkerErrorsAlarm', {
      alarmName: `stalld-${config.envName}-charge-worker-errors`,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    schedulerFn.metricErrors().createAlarm(this, 'SweepSchedulerErrorsAlarm', {
      alarmName: `stalld-${config.envName}-sweep-scheduler-errors`,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
  }
}
