/**
 * AWS Data Provider (Placeholder)
 * 
 * This provider will implement IDataService using:
 *   - AWS AppSync (GraphQL) for data queries
 *   - Aurora Serverless v2 (PostgreSQL) as the database
 *   - AWS Lambda for complex business logic (RPCs)
 * 
 * Required AWS SDK packages (install when implementing):
 *   @aws-sdk/client-rds-data
 *   @aws-amplify/api  (for AppSync)
 *   aws-appsync
 */

import type { IDataService, IQueryBuilder, FunctionInvokeResult } from '../../data.service';

/**
 * Placeholder query builder that throws on execution.
 * Replace with real AppSync/Aurora query logic when implementing.
 */
function createPlaceholderQueryBuilder<T>(): IQueryBuilder<T> {
  const notImplemented = (): IQueryBuilder<T> => builder;
  const builder: IQueryBuilder<T> = {
    select: notImplemented as any,
    insert: notImplemented as any,
    update: notImplemented as any,
    upsert: notImplemented as any,
    delete: notImplemented as any,
    eq: notImplemented as any,
    neq: notImplemented as any,
    in: notImplemented as any,
    not: notImplemented as any,
    is: notImplemented as any,
    gte: notImplemented as any,
    lte: notImplemented as any,
    gt: notImplemented as any,
    lt: notImplemented as any,
    order: notImplemented as any,
    limit: notImplemented as any,
    range: notImplemented as any,
    single: notImplemented as any,
    maybeSingle: notImplemented as any,
    then: (onfulfilled) => {
      const result = { data: null, error: new Error('AWS data provider not yet implemented') };
      return Promise.resolve(result).then(onfulfilled as any);
    },
  };
  return builder;
}

export class AwsDataProvider implements IDataService {

  from<T = unknown>(_table: string): IQueryBuilder<T> {
    // TODO: Map table name → AppSync query / Aurora SQL
    return createPlaceholderQueryBuilder<T>();
  }

  async rpc(_fn: string, _params?: Record<string, unknown>): Promise<{ data: unknown; error: Error | null }> {
    // TODO: Map RPC function name → AWS Lambda invocation
    return { data: null, error: new Error('AWS RPC not yet implemented') };
  }

  functions = {
    async invoke<T = unknown>(
      _functionName: string,
      _options?: { body?: unknown },
    ): Promise<FunctionInvokeResult<T>> {
      // TODO: Invoke AWS Lambda function
      return { data: null, error: new Error('AWS Lambda invoke not yet implemented') };
    },
  };

  auth = {
    async getSession() {
      // TODO: Get current Cognito session
      return { data: { session: null } };
    },
    async getUser() {
      // TODO: Get current Cognito user
      return { data: { user: null } };
    },
  };
}
