import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to Postgres changes on one or more tables and invalidate the given
 * React Query keys when any change is received.
 *
 * @example
 * useRealtimeSubscription(["klinik_queue"], [["klinik", "queue"]]);
 */
export function useRealtimeSubscription(
  tables: string[],
  queryKeys: ReadonlyArray<ReadonlyArray<unknown>>,
  schema: string = "public",
) {
  const qc = useQueryClient();
  const tablesKey = tables.join(",");
  const keysKey = JSON.stringify(queryKeys);

  useEffect(() => {
    const channelName = `rt-${schema}-${tablesKey}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase.channel(channelName);

    for (const table of tables) {
      channel.on(
        // @ts-expect-error postgres_changes is valid at runtime
        "postgres_changes",
        { event: "*", schema, table },
        () => {
          for (const key of queryKeys) {
            qc.invalidateQueries({ queryKey: key as unknown[] });
          }
        },
      );
    }

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey, keysKey, schema]);
}
