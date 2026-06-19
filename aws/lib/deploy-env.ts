import { execSync } from 'child_process';

export interface DeployEnv {
  account: string;
  region: string;
}

/**
 * Resolve the AWS account + region for CDK deploy.
 *
 * Priority:
 *   1. CDK_DEFAULT_ACCOUNT / CDK_DEFAULT_REGION (or AWS_REGION)
 *   2. Values from the active AWS CLI profile (sts get-caller-identity)
 */
export function resolveDeployEnv(): DeployEnv {
  const region =
    process.env.CDK_DEFAULT_REGION ??
    process.env.AWS_DEFAULT_REGION ??
    process.env.AWS_REGION ??
    tryAwsCommand('aws configure get region') ??
    'us-east-1';

  const account =
    process.env.CDK_DEFAULT_ACCOUNT ?? tryAwsCommand('aws sts get-caller-identity --query Account --output text');

  if (!account) {
    throw new Error(
      [
        'Could not determine AWS account for CDK deploy.',
        '',
        'Fix:',
        '  1. Authenticate:  aws login   (or configure credentials another way)',
        '  2. Verify access: aws sts get-caller-identity',
        '  3. Optionally pin deploy target:',
        '       export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)',
        '       export CDK_DEFAULT_REGION=us-east-1',
        '',
        'Then run: npm run deploy:dev',
      ].join('\n'),
    );
  }

  return { account, region };
}

function tryAwsCommand(command: string): string | undefined {
  try {
    const value = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}
