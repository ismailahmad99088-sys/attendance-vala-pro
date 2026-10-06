import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { errMsg, fetchEmployees, fmtDateTime } from "@/lib/attendance";
import { useAttendanceRealtime } from "@/hooks/use-attendance-realtime";
import { DemoTag, Empty, PageHeader, Panel, Td, Th } from "@/components/att/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/attendance/corrections")({
  head: () => ({ meta: [{ title: "Corrections — Attendance Vala" }, { name: "description", content: "Attendance correction requests and approvals." }] }),
  component: CorrectionsPage,
});

const ST: Record<string, string> = { PENDING: "text-warning", APPROVED: "text-success", REJECTED: "text-destructive" };

function CorrectionsPage() {
  const app = useApp();
  useAttendanceRealtime();
  const qc = useQueryClient();
  const emps = useQuery({ queryKey: ["att", "emps"], queryFn: fetchEmployees });
  const list = useQuery({
    queryKey: ["att", "corrections"],
    queryFn: async () => (await supabase.from("attendance_corrections").select("*").order("created_at", { ascending: false }).limit(300)).data ?? [],
  });
  const em = useMemo(() => new Map((emps.data ?? []).map((e) => [e.id, e])), [emps.data]);

  async function review(id: string, approve: boolean) {
    const note = approve ? "Approved" : window.prompt("Reason for rejection?") ?? "";
    if (!approve && !note) return;
    const { error } = await supabase.rpc("review_correction", { _id: id, _approve: approve, _note: note });
    if (error) return toast.error(errMsg(error));
    toast.success(approve ? "Correction approved — new event recorded, original kept" : "Correction rejected");
    qc.invalidateQueries({ queryKey: ["att"] });
  }

  return (
    <div>
      <PageHeader title="Attendance corrections" sub="Original events are never overwritten; approved corrections add a new event and void the old one."
        actions={<RequestDialog emps={(emps.data ?? []).filter((e) => app.can.operate || e.id === app.myEmployeeId)} tz={app.tz} />} />
      <Panel>
        {(list.data ?? []).length === 0 ? <Empty>{list.isLoading ? "Loading…" : "No correction requests yet."}</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr><Th>Employee</Th><Th>Date</Th><Th>Type</Th><Th>Original</Th><Th>Requested</Th><Th>Reason</Th><Th>Status</Th><Th>Reviewed</Th><Th /></tr></thead>
            <tbody className="divide-y">
              {list.data!.map((c) => (
                <tr key={c.id}>
                  <Td className="font-medium"><span className="flex items-center gap-1.5">{em.get(c.employee_id)?.full_name ?? "—"} {c.is_demo && <DemoTag />}</span></Td>
                  <Td className="font-mono text-xs">{c.work_date}</Td>
                  <Td className="text-xs">{c.correction_type.replace(/_/g, " ")}</Td>
                  <Td className="font-mono text-xs">{fmtDateTime(c.original_value, app.tz)}</Td>
                  <Td className="font-mono text-xs">{fmtDateTime(c.requested_value, app.tz)}</Td>
                  <Td className="max-w-xs truncate text-xs text-muted-foreground" >{c.reason}</Td>
                  <Td className={`text-xs font-semibold ${ST[c.status]}`}>{c.status}</Td>
                  <Td className="text-xs text-muted-foreground">{c.reviewed_at ? fmtDateTime(c.reviewed_at, app.tz) : "—"}</Td>
                  <Td>
                    {c.status === "PENDING" && app.can.approve && c.requested_by !== app.userId && (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => review(c.id, true)}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => review(c.id, false)}>Reject</Button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </Panel>
    </div>
  );
}

function RequestDialog({ emps, tz }: { emps: { id: string; full_name: string; employee_code: string }[]; tz: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ emp: "", date: "", type: "MISSING_CHECK_OUT", event: "", time: "", reason: "" });
  const events = useQuery({
    queryKey: ["att", "events", f.emp, f.date],
    enabled: f.type === "INCORRECT_TIMESTAMP" && !!f.emp && !!f.date,
    queryFn: async () => (await supabase.from("attendance_events").select("id,event_type,occurred_at").eq("employee_id", f.emp).eq("work_date", f.date).order("occurred_at")).data ?? [],
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.rpc("request_correction", {
      _employee_id: f.emp, _work_date: f.date, _type: f.type, _original_event_id: (f.event || null) as string, _requested_time: f.time, _reason: f.reason,
    });
    if (error) return toast.error(errMsg(error));
    toast.success("Correction requested");
    setOpen(false);
    setF({ emp: "", date: "", type: "MISSING_CHECK_OUT", event: "", time: "", reason: "" });
    qc.invalidateQueries({ queryKey: ["att"] });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Request correction</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Request attendance correction</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label>Employee</Label>
            <Select value={f.emp} onValueChange={(v) => setF({ ...f, emp: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name} · {e.employee_code}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v, event: "" })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="MISSING_CHECK_IN">Missing check-in</SelectItem><SelectItem value="MISSING_CHECK_OUT">Missing check-out</SelectItem><SelectItem value="INCORRECT_TIMESTAMP">Incorrect timestamp</SelectItem></SelectContent></Select></div>
          </div>
          {f.type === "INCORRECT_TIMESTAMP" && (
            <div className="space-y-1.5"><Label>Original event</Label>
              <Select value={f.event} onValueChange={(v) => setF({ ...f, event: v })}><SelectTrigger><SelectValue placeholder={events.data?.length ? "Select event" : "No events on this date"} /></SelectTrigger>
                <SelectContent>{(events.data ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.event_type} · {fmtDateTime(e.occurred_at, tz)}</SelectItem>)}</SelectContent></Select></div>
          )}
          <div className="space-y-1.5"><Label>Correct time ({tz})</Label><Input type="time" required value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Reason</Label><Textarea required minLength={5} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
          <Button type="submit" disabled={!f.emp} className="w-full">Submit request</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
