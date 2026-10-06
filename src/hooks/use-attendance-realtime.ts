import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Subscribes to attendance event/correction changes and refreshes attendance queries. */
export function useAttendanceRealtime() {
  const qc = useQueryClient();
  const [live, setLive] = useState(false);
  useEffect(() => {
    const ch = supabase
      .channel("attendance-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_events" }, () => {
        qc.invalidateQueries({ queryKey: ["att"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_corrections" }, () => {
        qc.invalidateQueries({ queryKey: ["att"] });
      })
      .subscribe((s) => setLive(s === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
  return live;
}
