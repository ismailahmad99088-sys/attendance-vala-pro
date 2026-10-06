import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { errMsg } from "@/lib/attendance";
import { DemoTag, Empty, PageHeader, Panel, Td, Th } from "@/components/att/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/attendance/locations")({
  head: () => ({ meta: [{ title: "Attendance Locations — Attendance Vala" }, { name: "description", content: "Geofenced attendance locations." }] }),
  component: LocationsPage,
});

type F = { id?: string; name: string; address: string; latitude: string; longitude: string; radius_m: number; status: string };
const blank: F = { name: "", address: "", latitude: "", longitude: "", radius_m: 150, status: "ACTIVE" };

function LocationsPage() {
  const { can } = useApp();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["att", "locations-all"], queryFn: async () => (await supabase.from("attendance_locations").select("*").order("name")).data ?? [] });
  const [edit, setEdit] = useState<F | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const { id, ...v } = edit;
    const vals = { ...v, address: v.address || null, latitude: v.latitude === "" ? null : Number(v.latitude), longitude: v.longitude === "" ? null : Number(v.longitude) };
    const res = id ? await supabase.from("attendance_locations").update(vals).eq("id", id) : await supabase.from("attendance_locations").insert(vals);
    if (res.error) return toast.error(errMsg(res.error));
    toast.success("Location saved");
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["att"] });
  }

  return (
    <div>
      <PageHeader title="Attendance locations" sub="Used to validate GPS check-ins against a geofence radius." actions={can.admin && <Button onClick={() => setEdit({ ...blank })}>New location</Button>} />
      <Panel>
        {(q.data ?? []).length === 0 ? <Empty>{q.isLoading ? "Loading…" : "No locations configured."}</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr><Th>Location</Th><Th>Address</Th><Th>Latitude</Th><Th>Longitude</Th><Th>Radius</Th><Th>Status</Th><Th /></tr></thead>
            <tbody className="divide-y">{q.data!.map((l) => (
              <tr key={l.id}><Td className="font-medium"><span className="flex items-center gap-1.5">{l.name} {l.is_demo && <DemoTag />}</span></Td>
                <Td className="text-muted-foreground">{l.address ?? "—"}</Td><Td className="font-mono">{l.latitude ?? "—"}</Td><Td className="font-mono">{l.longitude ?? "—"}</Td>
                <Td>{l.radius_m} m</Td><Td className={l.status === "ACTIVE" ? "text-success" : "text-muted-foreground"}>{l.status}</Td>
                <Td>{can.admin && <Button size="sm" variant="outline" onClick={() => setEdit({ id: l.id, name: l.name, address: l.address ?? "", latitude: l.latitude?.toString() ?? "", longitude: l.longitude?.toString() ?? "", radius_m: l.radius_m, status: l.status })}>Edit</Button>}</Td></tr>
            ))}</tbody></table></div>
        )}
      </Panel>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Edit location" : "New location"}</DialogTitle></DialogHeader>
          {edit && (
            <form onSubmit={save} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Name</Label><Input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Latitude</Label><Input type="number" step="any" min={-90} max={90} value={edit.latitude} onChange={(e) => setEdit({ ...edit, latitude: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Longitude</Label><Input type="number" step="any" min={-180} max={180} value={edit.longitude} onChange={(e) => setEdit({ ...edit, longitude: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Geofence radius (m)</Label><Input type="number" min={1} value={edit.radius_m} onChange={(e) => setEdit({ ...edit, radius_m: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Status</Label>
                <select className="h-9 w-full rounded-md border bg-transparent px-2 text-sm" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option>ACTIVE</option><option>INACTIVE</option></select></div>
              <Button type="submit" className="col-span-2">Save location</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
