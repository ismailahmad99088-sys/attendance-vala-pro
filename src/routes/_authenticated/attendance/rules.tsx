import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useApp } from "@/lib/app-context";
import { errMsg, fmtMinutes } from "@/lib/attendance";
import { DemoTag, Empty, PageHeader, Panel, Td, Th } from "@/components/att/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/attendance/rules")({
  head: () => ({ meta: [{ title: "Attendance Rules — Attendance Vala" }, { name: "description", content: "Shift times, grace periods and thresholds." }] }),
  component: RulesPage,
});

type Rule = Tables<"attendance_rules">;
const blank = { name: "", start_time: "09:00", end_time: "18:00", grace_minutes: 15, expected_minutes: 480, max_break_minutes: 60, overtime_threshold_minutes: 0, early_checkout_threshold_minutes: 0, status: "ACTIVE" };

function RulesPage() {
  const { can } = useApp();
  const qc = useQueryClient();
  const rules = useQuery({ queryKey: ["att", "rules"], queryFn: async () => (await supabase.from("attendance_rules").select("*").order("name")).data ?? [] });
  const [edit, setEdit] = useState<(typeof blank & { id?: string }) | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const { id, ...vals } = edit;
    const res = id ? await supabase.from("attendance_rules").update({ ...vals, updated_at: new Date().toISOString() }).eq("id", id) : await supabase.from("attendance_rules").insert(vals);
    if (res.error) return toast.error(errMsg(res.error));
    toast.success("Rule saved");
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["att"] });
  }
  const num = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setEdit((s) => s && { ...s, [k]: Number(e.target.value) });
  const str = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setEdit((s) => s && { ...s, [k]: e.target.value });

  return (
    <div>
      <PageHeader title="Attendance rules" sub="Late = check-in after start + grace. Early checkout = before end − threshold. Overtime = net hours above expected + threshold."
        actions={can.admin && <Button onClick={() => setEdit({ ...blank })}>New rule</Button>} />
      <Panel>
        {(rules.data ?? []).length === 0 ? <Empty>{rules.isLoading ? "Loading…" : "No rules yet."}</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr><Th>Rule</Th><Th>Start</Th><Th>End</Th><Th>Grace</Th><Th>Expected</Th><Th>Break</Th><Th>OT threshold</Th><Th>Early threshold</Th><Th>Status</Th><Th /></tr></thead>
            <tbody className="divide-y">{rules.data!.map((r: Rule) => (
              <tr key={r.id}><Td className="font-medium"><span className="flex items-center gap-1.5">{r.name} {r.is_demo && <DemoTag />}</span></Td>
                <Td className="font-mono">{r.start_time.slice(0, 5)}</Td><Td className="font-mono">{r.end_time.slice(0, 5)}</Td><Td>{r.grace_minutes}m</Td>
                <Td className="font-mono">{fmtMinutes(r.expected_minutes)}</Td><Td>{r.max_break_minutes}m</Td><Td>{r.overtime_threshold_minutes}m</Td><Td>{r.early_checkout_threshold_minutes}m</Td>
                <Td className={r.status === "ACTIVE" ? "text-success" : "text-muted-foreground"}>{r.status}</Td>
                <Td>{can.admin && <Button size="sm" variant="outline" onClick={() => setEdit({ ...r, start_time: r.start_time.slice(0, 5), end_time: r.end_time.slice(0, 5) })}>Edit</Button>}</Td></tr>
            ))}</tbody></table></div>
        )}
      </Panel>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Edit rule" : "New rule"}</DialogTitle></DialogHeader>
          {edit && (
            <form onSubmit={save} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Rule name</Label><Input required value={edit.name} onChange={str("name")} /></div>
              <div className="space-y-1.5"><Label>Start time</Label><Input type="time" required value={edit.start_time} onChange={str("start_time")} /></div>
              <div className="space-y-1.5"><Label>End time</Label><Input type="time" required value={edit.end_time} onChange={str("end_time")} /></div>
              <div className="space-y-1.5"><Label>Grace (min)</Label><Input type="number" min={0} value={edit.grace_minutes} onChange={num("grace_minutes")} /></div>
              <div className="space-y-1.5"><Label>Expected work (min)</Label><Input type="number" min={1} value={edit.expected_minutes} onChange={num("expected_minutes")} /></div>
              <div className="space-y-1.5"><Label>Max break (min)</Label><Input type="number" min={0} value={edit.max_break_minutes} onChange={num("max_break_minutes")} /></div>
              <div className="space-y-1.5"><Label>Overtime threshold (min)</Label><Input type="number" min={0} value={edit.overtime_threshold_minutes} onChange={num("overtime_threshold_minutes")} /></div>
              <div className="space-y-1.5"><Label>Early checkout threshold (min)</Label><Input type="number" min={0} value={edit.early_checkout_threshold_minutes} onChange={num("early_checkout_threshold_minutes")} /></div>
              <div className="space-y-1.5"><Label>Status</Label>
                <select className="h-9 w-full rounded-md border bg-transparent px-2 text-sm" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                  <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></div>
              <Button type="submit" className="col-span-2">Save rule</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
