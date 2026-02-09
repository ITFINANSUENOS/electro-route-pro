// IDataService - Interface for generic data operations
// Implementations live in src/services/providers/

/**
 * Generic query result matching Supabase's response shape.
 * Future providers (AWS DynamoDB, etc.) must map to this format.
 */
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Chainable query builder interface.
 * Mirrors the most-used Supabase PostgREST methods so components
 * can build queries without importing the Supabase client.
 */
export interface IQueryBuilder<T = unknown> {
  select(columns?: string): IQueryBuilder<T[]>;
  insert(values: Partial<T> | Partial<T>[]): IQueryBuilder<T>;
  update(values: Partial<T>): IQueryBuilder<T>;
  upsert(values: Partial<T> | Partial<T>[], options?: { onConflict?: string }): IQueryBuilder<T>;
  delete(): IQueryBuilder<T>;
  eq(column: string, value: unknown): IQueryBuilder<T>;
  neq(column: string, value: unknown): IQueryBuilder<T>;
  in(column: string, values: unknown[]): IQueryBuilder<T>;
  not(column: string, operator: string, value: unknown): IQueryBuilder<T>;
  is(column: string, value: unknown): IQueryBuilder<T>;
  gte(column: string, value: unknown): IQueryBuilder<T>;
  lte(column: string, value: unknown): IQueryBuilder<T>;
  gt(column: string, value: unknown): IQueryBuilder<T>;
  lt(column: string, value: unknown): IQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): IQueryBuilder<T>;
  limit(count: number): IQueryBuilder<T>;
  range(from: number, to: number): IQueryBuilder<T>;
  single(): IQueryBuilder<T>;
  maybeSingle(): IQueryBuilder<T>;
  then<TResult>(
    onfulfilled?: (value: QueryResult<T>) => TResult | PromiseLike<TResult>,
  ): Promise<TResult>;
}

/**
 * Edge function invocation result
 */
export interface FunctionInvokeResult<T = unknown> {
  data: T | null;
  error: Error | null;
}

/**
 * IDataService abstracts all non-auth data operations.
 * Components call dataService.from('table') instead of supabase.from('table').
 */
export interface IDataService {
  from<T = unknown>(table: string): IQueryBuilder<T>;
  rpc(fn: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: Error | null }>;
  functions: {
    invoke<T = unknown>(functionName: string, options?: { body?: unknown }): Promise<FunctionInvokeResult<T>>;
  };
  auth: {
    getSession(): Promise<{ data: { session: unknown | null } }>;
    getUser(): Promise<{ data: { user: unknown | null } }>;
  };
}
