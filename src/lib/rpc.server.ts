// Thin, explicitly-untyped wrapper for Postgres functions that exist in our migrations but are not
// yet in the generated src/integrations/supabase/types.ts (that file is regenerated from the LIVE
// schema, so it only learns about a function after its migration has been applied).
// Once the types are regenerated, call supabase.rpc(...) directly and delete this file.

export type RpcResult<T = unknown> = {
  data: T | null;
  error: { code?: string; message: string } | null;
};

type RpcCapable = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult>;
};

export function callRpc<T = unknown>(
  client: unknown,
  fn: string,
  args: Record<string, unknown>,
): PromiseLike<RpcResult<T>> {
  return (client as RpcCapable).rpc(fn, args) as PromiseLike<RpcResult<T>>;
}
