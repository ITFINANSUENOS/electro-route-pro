import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { IDataService, IQueryBuilder, FunctionInvokeResult } from '../../data.service';

type TableName = keyof Database['public']['Tables'] | keyof Database['public']['Views'];

/**
 * Supabase implementation of IDataService.
 * This is the ONLY file (besides auth.provider.ts) that imports the supabase client.
 * 
 * The query builder is a thin passthrough to the Supabase PostgREST client,
 * preserving full chainability while abstracting the import.
 */
export class SupabaseDataProvider implements IDataService {

  from<T = unknown>(table: string): IQueryBuilder<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (supabase.from as any)(table) as IQueryBuilder<T>;
  }

  async rpc(fn: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: Error | null }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (supabase.rpc as any)(fn, params);
    return {
      data: result.data,
      error: result.error ? new Error(result.error.message) : null,
    };
  }

  functions = {
    async invoke<T = unknown>(
      functionName: string,
      options?: { body?: unknown },
    ): Promise<FunctionInvokeResult<T>> {
      const result = await supabase.functions.invoke(functionName, options);
      return {
        data: result.data as T | null,
        error: result.error ? new Error(result.error.message) : null,
      };
    },
  };

  auth = {
    async getSession() {
      const { data } = await supabase.auth.getSession();
      return { data: { session: data.session } };
    },
    async getUser() {
      const { data } = await supabase.auth.getUser();
      return { data: { user: data.user } };
    },
  };
}
