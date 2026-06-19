import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

export interface CreateFunctionOptions {
  entry: string;
  environment?: Record<string, string>;
  timeout?: Duration;
  memorySize?: number;
}

// Shared NodejsFunction factory: Node 20, esbuild bundling, short-retention log
// groups (so dev stacks tear down cleanly), and @aws-sdk left external since it
// ships in the Lambda runtime.
export function createFunction(
  scope: Construct,
  id: string,
  options: CreateFunctionOptions,
): NodejsFunction {
  const logGroup = new LogGroup(scope, `${id}Logs`, {
    retention: RetentionDays.TWO_WEEKS,
    removalPolicy: RemovalPolicy.DESTROY,
  });

  return new NodejsFunction(scope, id, {
    runtime: Runtime.NODEJS_20_X,
    entry: path.join(__dirname, '..', 'functions', options.entry),
    handler: 'handler',
    timeout: options.timeout ?? Duration.seconds(30),
    memorySize: options.memorySize ?? 256,
    environment: options.environment,
    logGroup,
    bundling: {
      minify: true,
      sourceMap: true,
      target: 'node20',
      format: OutputFormat.CJS,
      externalModules: ['@aws-sdk/*'],
    },
  });
}
