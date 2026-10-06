import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { downloadCsv, fetchEmployees, fetchRange, fmtDateTime, fmtMinutes, fmtTime, todayIn } from "@/lib/attendance";
import { Empty, PageHeader, Panel, Td, Th } from "@/components/att/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/attendance/reports")({
  head: () => ({ meta: [{ title: "Reports — Attendance Vala" }, { name: "description", content: "Attendance reports with CSV export." }] }),
  component: ReportsPage,
});

const REPORTS = {
  daily: "Daily attendance", late: "Late report", absent: "Absent report", early: "Early checkout report",
  overtime: "Overtime report", hours: "Working hours report", break: "Break report", missing: "Missing punch report",
  corrections: "Attendance correction report", devices: "Device sync report",
} as const;
type RK = keyof typeof REPORTS;

function ReportsPage() {
  const { tz } = useApp();
  const today = todayIn(tz);
  const [rk, setRk] = useState<RK>("late");
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [dept, setDept] = useState("all");
  const emps = useQuery({ queryKey: ["att", "emps"], queryFn: fetchEmployees });
  const range = useQuery({ queryKey: ["att", "range", from, to], queryFn: () => fetchRange(from, to), enabled: from <= to && !["corrections", "devices"].includes(rk) });
  const corr = useQuery({ queryKey: ["att", "corr-report", from, to], enabled: rk === "corrections",
    queryFn: async () => (await supabase.from("attendance_corrections").select("*").gte("work_date", from).lte("work_date", to).order("work_date")).data ?? [] });
  const dev = useQuery({ queryKey: ["att", "devices"], enabled: rk === "devices", queryFn: async () => (await supabase.from("attendance_devices").select("*").order("name")).data ?? [] });

  const em = useMemo(() => new Map((emps.data ?? []).map((e) => [e.id, e])), [emps.data]);
  const depts = useMemo(() => Array.from(new Set((emps.data ?? []).map((e) => e.departments?.name).filter(Boolean))) as string[], [emps.data]);

  const rows: Record<string, string | number>[] = useMemo(() => {
    if (rk === "corrections") return (corr.data ?? []).map((c) => ({ date: c.work_date, employee: em.get(c.employee_id)?.full_name ?? "", type: c.correction_type, original: fmtDateTime(c.original_value, tz), requested: fmtDateTime(c.requested_value, tz), reason: c.reason, status: c.status, reviewed_at: fmtDateTime(c.reviewed_at, tz) }));
    if (rk === "devices") return (dev.data ?? []).map((d) => ({ device: d.name, id: d.device_code, status: d.status, last_sync: d.last_sync_at ? fmtDateTime(d.last_sync_at, tz) : "Never", received: d.events_received, processed: d.events_processed, failed: d.events_failed, duplicate: d.events_duplicate, last_error: d.last_error ?? "" }));
    const base = (range.data ?? []).filter((r) => {
      const e = em.get(r.employee_id); return e && r.status !== "OFF" && (dept === "all" || e.departments?.name === dept);
    });
    const f = {
      daily: () => true, late: (r: typeof base[number]) => r.is_late, absent: (r: typeof base[number]) => r.status === "ABSENT",
      early: (r: typeof base[number]) => r.is_early, overtime: (r: typeof base[number]) => r.overtime_minutes > 0, hours: (r: typeof base[number]) => !!r.check_in,
      break: (r: typeof base[number]) => r.break_minutes > 0, missing: (r: typeof base[number]) => r.status === "MISSING_CHECKOUT",
    }[rk as Exclude<RK, "corrections" | "devices">];
    return base.filter(f).map((r) => {
      const e = em.get(r.employee_id)!;
      return { date: r.work_date, employee: e.full_name, id: e.employee_code, team: e.departments?.name ?? "", check_in: fmtTime(r.check_in, tz), check_out: fmtTime(r.check_out, tz),
        late_min: r.late_minutes, break: fmtMinutes(r.break_minutes), net: fmtMinutes(r.net_minutes), overtime: fmtMinutes(r.overtime_minutes), method: r.check_in_method ?? "", status: r.status };
    });
  }, [rk, range.data, corr.data, dev.data, em, dept, tz]);

  const cols = rows[0] ? Object.keys(rows[0]) : [];
  const loading = range.isLoading || corr.isLoading || dev.isLoading;

  return (
    <div>
      <PageHeader title="Attendance reports" sub="Every row comes from recorded attendance data."
        actions={<Button onClick={() => downloadCsv(`${rk}-${from}-${to}.csv`, rows)} disabled={!rows.length}>Export CSV</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={rk} onValueChange={(v) => setRk(v as RK)}><SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(REPORTS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
        {rk !== "devices" && <>
          <Input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="w-40" />
          <Input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className="w-40" />
        </>}
        {!["corrections", "devices"].includes(rk) && (
          <Select value={dept} onValueChange={setDept}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All teams</SelectItem>{depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
        )}
        <span className="self-center text-xs text-muted-foreground">{rows.length} rows</span>
      </div>
      <Panel title={REPORTS[rk]}>
        {loading ? <Empty>Loading…</Empty> : rows.length === 0 ? <Empty>No records for this report and filter.</Empty> : (
          <div className="max-h-[65vh] overflow-auto"><table className="w-full text-sm">
            <thead className="sticky top-0 border-b bg-card"><tr>{cols.map((c) => <Th key={c}>{c.replace(/_/g, " ")}</Th>)}</tr></thead>
            <tbody className="divide-y">{rows.slice(0, 500).map((r, i) => <tr key={i}>{cols.map((c) => <Td key={c} className="font-mono text-xs">{String(r[c])}</Td>)}</tr>)}</tbody>
          </table></div>
        )}
      </Panel>
    </div>
  );
}
