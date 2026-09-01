import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to Supabase Realtime changes on `table` and invalidates the
 * given react-query key(s) whenever a row changes, so the UI refetches and
 * reflects the change instantly (e.g. stock changes, new orders, new repair
 * enquiries) without a manual page reload.
 */
export function useRealtimeRefetch(table: string, queryKeys: QueryKey[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          for (const key of queryKeys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
}
