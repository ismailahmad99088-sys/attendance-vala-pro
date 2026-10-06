import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { fmtDateTime } from "@/lib/attendance";
import { Empty, PageHeader, Panel, Td, Th } from "@/components/att/ui";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/attendance/audit")({
  head: () => ({ meta: [{ title: "Audit Logs — Attendance Vala" }, { name: "description", content: "Immutable attendance audit trail." }] }),
  component: AuditPage,
});

function AuditPage() {
  const { tz, can } = useApp();
  const [q, setQ] = useState("");
  const logs = useQuery({
    queryKey: ["att", "audit"],
    enabled: can.admin,
    queryFn: async () => (await supabase.from("attendance_audit_logs").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  if (!can.admin) return <p className="text-sm text-muted-foreground">Audit logs are restricted to administrators.</p>;
  const list = (logs.data ?? []).filter((l) => !q || `${l.action} ${l.actor_email} ${l.entity}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="Audit logs" sub="Latest 500 entries. Passwords and keys are never logged." actions={<Input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-64" />} />
      <Panel>
        {list.length === 0 ? <Empty>{logs.isLoading ? "Loading…" : "No audit entries."}</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr><Th>Time</Th><Th>Action</Th><Th>Actor</Th><Th>Entity</Th><Th>Details</Th></tr></thead>
            <tbody className="divide-y">{list.map((l) => (
              <tr key={l.id}><Td className="font-mono text-xs">{fmtDateTime(l.created_at, tz)}</Td><Td className="font-mono text-xs text-primary">{l.action}</Td>
                <Td className="text-xs">{l.actor_email ?? "system"}</Td><Td className="text-xs text-muted-foreground">{l.entity}</Td>
                <Td className="max-w-md truncate font-mono text-[11px] text-muted-foreground">{JSON.stringify(l.details)}</Td></tr>
            ))}</tbody></table></div>
        )}
      </Panel>
    </div>
  );
}
