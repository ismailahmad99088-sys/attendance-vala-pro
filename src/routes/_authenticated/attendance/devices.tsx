import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { errMsg, fmtDateTime } from "@/lib/attendance";
import { DemoTag, Empty, PageHeader, Panel, Td, Th } from "@/components/att/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/attendance/devices")({
  head: () => ({ meta: [{ title: "Attendance Devices — Attendance Vala" }, { name: "description", content: "Biometric and terminal device registry and sync status." }] }),
  component: DevicesPage,
});

const STC: Record<string, string> = { CONNECTED: "text-success", DISCONNECTED: "text-warning", ERROR: "text-destructive", NOT_CONFIGURED: "text-muted-foreground" };

function DevicesPage() {
  const { can, tz } = useApp();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["att", "devices"], queryFn: async () => (await supabase.from("attendance_devices").select("*, attendance_locations(name)").order("name")).data ?? [] });
  const locs = useQuery({ queryKey: ["att", "locations-all"], queryFn: async () => (await supabase.from("attendance_locations").select("*").order("name")).data ?? [] });
  const [f, setF] = useState<{ name: string; device_code: string; device_type: string; location_id: string; connection_ref: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    const { error } = await supabase.from("attendance_devices").insert({ ...f, location_id: f.location_id || null, connection_ref: f.connection_ref || null });
    if (error) return toast.error(errMsg(error));
    toast.success("Device registered as NOT_CONFIGURED until a real integration reports in");
    setF(null);
    qc.invalidateQueries({ queryKey: ["att"] });
  }

  return (
    <div>
      <PageHeader title="Attendance devices" sub="Status and sync counters only change when a real device integration reports events."
        actions={can.admin && <Button onClick={() => setF({ name: "", device_code: "", device_type: "FINGERPRINT", location_id: "", connection_ref: "" })}>Register device</Button>} />
      <Panel>
        {(q.data ?? []).length === 0 ? <Empty>{q.isLoading ? "Loading…" : "No devices registered."}</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr><Th>Device</Th><Th>Device ID</Th><Th>Type</Th><Th>Location</Th><Th>Connection</Th><Th>Status</Th><Th>Last sync</Th><Th>Last event</Th><Th>Received</Th><Th>Processed</Th><Th>Failed</Th><Th>Duplicate</Th><Th>Last error</Th></tr></thead>
            <tbody className="divide-y">{q.data!.map((d) => (
              <tr key={d.id}><Td className="font-medium"><span className="flex items-center gap-1.5">{d.name} {d.is_demo && <DemoTag />}</span></Td>
                <Td className="font-mono text-xs">{d.device_code}</Td><Td className="text-xs">{d.device_type}</Td><Td>{d.attendance_locations?.name ?? "—"}</Td>
                <Td className="font-mono text-xs">{d.connection_ref ?? "—"}</Td><Td className={`font-mono text-xs font-semibold ${STC[d.status]}`}>{d.status}</Td>
                <Td className="text-xs">{d.last_sync_at ? fmtDateTime(d.last_sync_at, tz) : "Never"}</Td><Td className="text-xs">{d.last_event_at ? fmtDateTime(d.last_event_at, tz) : "—"}</Td>
                <Td>{d.events_received}</Td><Td>{d.events_processed}</Td><Td>{d.events_failed}</Td><Td>{d.events_duplicate}</Td><Td className="text-xs text-destructive">{d.last_error ?? "—"}</Td></tr>
            ))}</tbody></table></div>
        )}
      </Panel>
      <Dialog open={!!f} onOpenChange={(o) => !o && setF(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register attendance device</DialogTitle></DialogHeader>
          {f && (
            <form onSubmit={save} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Device name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Device ID</Label><Input required value={f.device_code} onChange={(e) => setF({ ...f, device_code: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Type</Label>
                <select className="h-9 w-full rounded-md border bg-transparent px-2 text-sm" value={f.device_type} onChange={(e) => setF({ ...f, device_type: e.target.value })}>
                  <option value="FINGERPRINT">Fingerprint</option><option value="FACE">Face recognition</option><option value="RFID">RFID</option><option value="TERMINAL">Attendance terminal</option></select></div>
              <div className="space-y-1.5"><Label>Location</Label>
                <select className="h-9 w-full rounded-md border bg-transparent px-2 text-sm" value={f.location_id} onChange={(e) => setF({ ...f, location_id: e.target.value })}>
                  <option value="">—</option>{(locs.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
              <div className="space-y-1.5"><Label>IP / connection ref</Label><Input value={f.connection_ref} onChange={(e) => setF({ ...f, connection_ref: e.target.value })} /></div>
              <Button type="submit" className="col-span-2">Register</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
