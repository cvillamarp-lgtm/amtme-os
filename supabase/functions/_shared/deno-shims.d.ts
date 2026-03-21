declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  interface SupabaseEdgeUser {
    id: string;
  }

  interface SupabaseEdgeAuthClient {
    getUser(): Promise<{
      data: { user: SupabaseEdgeUser | null };
      error: { message?: string } | null;
    }>;
  }

  interface SupabaseEdgeQueryBuilder {
    select(...args: unknown[]): SupabaseEdgeQueryBuilder;
    insert(...args: unknown[]): SupabaseEdgeQueryBuilder;
    update(...args: unknown[]): SupabaseEdgeQueryBuilder;
    delete(...args: unknown[]): SupabaseEdgeQueryBuilder;
    eq(...args: unknown[]): SupabaseEdgeQueryBuilder;
    in(...args: unknown[]): SupabaseEdgeQueryBuilder;
    order(...args: unknown[]): SupabaseEdgeQueryBuilder;
    limit(...args: unknown[]): SupabaseEdgeQueryBuilder;
    single(): Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>;
    then: PromiseLike<{ data: Record<string, unknown>[] | null; error: { message?: string } | null }>['then'];
  }

  interface SupabaseEdgeStorageBucket {
    upload(...args: unknown[]): Promise<{ data?: unknown; error: { message?: string } | null }>;
    getPublicUrl(...args: unknown[]): { data: { publicUrl: string } };
  }

  interface SupabaseEdgeClient {
    auth: SupabaseEdgeAuthClient;
    from(table: string): SupabaseEdgeQueryBuilder;
    storage: {
      createBucket(...args: unknown[]): Promise<{ data?: unknown; error: { message?: string } | null }>;
      from(bucket: string): SupabaseEdgeStorageBucket;
    };
  }

  export function createClient(...args: unknown[]): SupabaseEdgeClient;
}
