import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { downloadCsv, fetchEmployees, fetchRange, fmtMinutes, fmtTime, todayIn } from "@/lib/attendance";
import { Empty, PageHeader, Panel, StatusBadge, Td, Th } from "@/components/att/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/attendance/history")({
  head: () => ({ meta: [{ title: "Attendance History — Attendance Vala" }, { name: "description", content: "Attendance history and monthly summary." }] }),
  component: HistoryPage,
});

function shiftDate(d: string, days: number) {
  const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + days); return x.toISOString().slice(0, 10);
}

function avgTime(isos: string[], tz: string) {
  if (!isos.length) return "—";
  const mins = isos.map((i) => {
    const [h, m] = fmtTime(i, tz).split(":").map(Number); return (h ?? 0) * 60 + (m ?? 0);
  });
  const a = Math.round(mins.reduce((x, y) => x + y, 0) / mins.length);
  return `${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

function HistoryPage() {
  const { tz } = useApp();
  const today = todayIn(tz);
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"monthly" | "daily">("monthly");
  const emps = useQuery({ queryKey: ["att", "emps"], queryFn: fetchEmployees });
  const range = useQuery({ queryKey: ["att", "range", from, to], queryFn: () => fetchRange(from, to), enabled: from <= to });
  const em = useMemo(() => new Map((emps.data ?? []).map((e) => [e.id, e])), [emps.data]);
  const rows = useMemo(() => (range.data ?? []).filter((r) => {
    const e = em.get(r.employee_id); return e && r.status !== "OFF" && (!q || `${e.full_name} ${e.employee_code}`.toLowerCase().includes(q.toLowerCase()));
  }), [range.data, em, q]);

  const monthly = useMemo(() => {
    const g = new Map<string, typeof rows>();
    rows.forEach((r) => g.set(r.employee_id, [...(g.get(r.employee_id) ?? []), r]));
    return [...g.entries()].map(([id, rs]) => ({
      emp: em.get(id)!,
      working: rs.length,
      present: rs.filter((r) => r.check_in).length,
      absent: rs.filter((r) => r.status === "ABSENT").length,
      late: rs.filter((r) => r.is_late).length,
      early: rs.filter((r) => r.is_early).length,
      net: rs.reduce((a, r) => a + (r.net_minutes ?? 0), 0),
      brk: rs.reduce((a, r) => a + (r.break_minutes ?? 0), 0),
      ot: rs.reduce((a, r) => a + (r.overtime_minutes ?? 0), 0),
      avgIn: avgTime(rs.map((r) => r.check_in!).filter(Boolean), tz),
      avgOut: avgTime(rs.map((r) => r.check_out!).filter(Boolean), tz),
    })).sort((a, b) => a.emp.employee_code.localeCompare(b.emp.employee_code));
  }, [rows, em, tz]);

  function exportCsv() {
    if (view === "monthly") downloadCsv(`monthly-${from}-${to}.csv`, monthly.map((m) => ({
      employee: m.emp.full_name, id: m.emp.employee_code, working_days: m.working, present: m.present, absent: m.absent, late: m.late,
      early_checkout: m.early, worked_hours: (m.net / 60).toFixed(2), break_hours: (m.brk / 60).toFixed(2), overtime_hours: (m.ot / 60).toFixed(2),
      avg_check_in: m.avgIn, avg_check_out: m.avgOut,
    })));
    else downloadCsv(`daily-${from}-${to}.csv`, rows.map((r) => ({
      date: r.work_date, employee: em.get(r.employee_id)!.full_name, id: em.get(r.employee_id)!.employee_code,
      check_in: fmtTime(r.check_in, tz), check_out: fmtTime(r.check_out, tz), net_min: r.net_minutes ?? "", break_min: r.break_minutes,
      late_min: r.late_minutes, overtime_min: r.overtime_minutes, method: r.check_in_method ?? "", status: r.status,
    })));
  }

  return (
    <div>
      <PageHeader title="Attendance history" sub="Max range 93 days. Weekends hidden."
        actions={<>
          <Input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-9 w-40" />
          <span className="text-muted-foreground">→</span>
          <Input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-9 w-40" />
          <Button variant="outline" size="sm" onClick={() => { setFrom(shiftDate(today, -6)); setTo(today); }}>Last 7 days</Button>
          <Button size="sm" onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
        </>} />
      <div className="mb-3 flex items-center gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as "monthly" | "daily")}><TabsList><TabsTrigger value="monthly">Summary</TabsTrigger><TabsTrigger value="daily">Daily records</TabsTrigger></TabsList></Tabs>
        <Input placeholder="Filter employee…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 max-w-xs" />
      </div>
      <Panel>
        {range.isLoading ? <Empty>Loading…</Empty> : rows.length === 0 ? <Empty>No records in this range.</Empty> : view === "monthly" ? (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr><Th>Employee</Th><Th>Working</Th><Th>Present</Th><Th>Absent</Th><Th>Late</Th><Th>Early</Th><Th>Worked</Th><Th>Break</Th><Th>Overtime</Th><Th>Avg in</Th><Th>Avg out</Th></tr></thead>
            <tbody className="divide-y">{monthly.map((m) => (
              <tr key={m.emp.id} className="tabular"><Td className="font-medium">{m.emp.full_name} <span className="font-mono text-[11px] text-muted-foreground">{m.emp.employee_code}</span></Td>
                <Td>{m.working}</Td><Td className="text-success">{m.present}</Td><Td className="text-destructive">{m.absent}</Td><Td className="text-warning">{m.late}</Td><Td>{m.early}</Td>
                <Td className="font-mono">{fmtMinutes(m.net)}</Td><Td className="font-mono">{fmtMinutes(m.brk)}</Td><Td className="font-mono">{fmtMinutes(m.ot)}</Td><Td className="font-mono">{m.avgIn}</Td><Td className="font-mono">{m.avgOut}</Td></tr>
            ))}</tbody></table></div>
        ) : (
          <div className="max-h-[70vh] overflow-auto"><table className="w-full text-sm">
            <thead className="sticky top-0 border-b bg-card"><tr><Th>Date</Th><Th>Employee</Th><Th>In</Th><Th>Out</Th><Th>Gross</Th><Th>Break</Th><Th>Net</Th><Th>Late</Th><Th>OT</Th><Th>Method</Th><Th>Status</Th></tr></thead>
            <tbody className="divide-y">{rows.slice(0, 1000).map((r) => (
              <tr key={r.work_date + r.employee_id}><Td className="font-mono text-xs">{r.work_date}</Td><Td>{em.get(r.employee_id)!.full_name}</Td>
                <Td className="font-mono">{fmtTime(r.check_in, tz)}</Td><Td className="font-mono">{fmtTime(r.check_out, tz)}</Td><Td className="font-mono">{fmtMinutes(r.gross_minutes)}</Td>
                <Td className="font-mono">{fmtMinutes(r.break_minutes)}</Td><Td className="font-mono">{fmtMinutes(r.net_minutes)}</Td><Td className="font-mono text-warning">{r.is_late ? `${r.late_minutes}m` : "—"}</Td>
                <Td className="font-mono">{r.overtime_minutes ? fmtMinutes(r.overtime_minutes) : "—"}</Td><Td className="text-xs">{r.check_in_method ?? "—"}</Td><Td><StatusBadge status={r.status} /></Td></tr>
            ))}</tbody></table></div>
        )}
      </Panel>
    </div>
  );
}
