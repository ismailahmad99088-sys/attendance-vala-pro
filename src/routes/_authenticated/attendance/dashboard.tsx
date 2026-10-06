import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { fetchDaySummary, fetchEmployees, fmtMinutes, fmtTime, todayIn } from "@/lib/attendance";
import { useAttendanceRealtime } from "@/hooks/use-attendance-realtime";
import { LiveTable, joinRows, type Row } from "@/components/att/LiveTable";
import { PageHeader, Panel, StatCard } from "@/components/att/ui";

export const Route = createFileRoute("/_authenticated/attendance/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Attendance Vala" }, { name: "description", content: "Live attendance command center." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { tz } = useApp();
  const live = useAttendanceRealtime();
  const today = todayIn(tz);
  const [status, setStatus] = useState("all");
  const emps = useQuery({ queryKey: ["att", "emps"], queryFn: fetchEmployees });
  const sum = useQuery({ queryKey: ["att", "day", today], queryFn: () => fetchDaySummary(today), refetchOnWindowFocus: true });

  const rows = useMemo(() => joinRows(sum.data ?? [], emps.data ?? []), [sum.data, emps.data]);
  const k = useMemo(() => {
    const c = (f: (r: Row) => boolean) => rows.filter(f).length;
    return {
      total: rows.length,
      present: c((r) => !!r.check_in),
      absent: c((r) => r.status === "ABSENT" || r.status === "NOT_MARKED"),
      late: c((r) => r.is_late),
      checkedIn: c((r) => !!r.check_in && !r.check_out),
      checkedOut: c((r) => !!r.check_out),
      working: c((r) => !!r.check_in && !r.check_out && !r.on_break),
      onBreak: c((r) => r.on_break),
      overtime: c((r) => r.overtime_minutes > 0),
      hours: rows.reduce((a, r) => a + (r.net_minutes ?? 0), 0),
    };
  }, [rows]);

  const insights = useMemo(() => {
    const longBreaks = rows.filter((r) => r.break_minutes > 60);
    const lateList = rows.filter((r) => r.is_late).sort((a, b) => b.late_minutes - a.late_minutes).slice(0, 5);
    const dueOut = rows.filter((r) => r.check_in && !r.check_out && r.net_minutes != null && r.net_minutes >= r.expected_minutes);
    return { longBreaks, lateList, dueOut };
  }, [rows]);

  const loading = emps.isLoading || sum.isLoading;
  const pick = (s: string) => setStatus((cur) => (cur === s ? "all" : s));

  return (
    <div>
      <PageHeader
        title="Attendance command center"
        sub={<>Today · {new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: tz }).format(new Date())} · {tz}</>}
        actions={
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${live ? "border-success/40 text-success" : "text-muted-foreground"}`}>
            <Radio className="h-3 w-3" /> {live ? "Realtime connected" : "Connecting…"}
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total employees" value={loading ? "…" : k.total} />
        <StatCard label="Present today" value={loading ? "…" : k.present} tone="success" />
        <StatCard label="Absent / not marked" value={loading ? "…" : k.absent} tone="danger" onClick={() => pick("NOT_MARKED")} active={status === "NOT_MARKED"} />
        <StatCard label="Late today" value={loading ? "…" : k.late} tone="warning" onClick={() => pick("LATE")} active={status === "LATE"} />
        <StatCard label="Checked in" value={loading ? "…" : k.checkedIn} tone="info" onClick={() => pick("PRESENT")} active={status === "PRESENT"} />
        <StatCard label="Checked out" value={loading ? "…" : k.checkedOut} onClick={() => pick("CHECKED_OUT")} active={status === "CHECKED_OUT"} />
        <StatCard label="Currently working" value={loading ? "…" : k.working} tone="success" hint={`${k.onBreak} on break`} onClick={() => pick("ON_BREAK")} active={status === "ON_BREAK"} />
        <StatCard label="Total hours today" value={loading ? "…" : fmtMinutes(k.hours)} tone="violet" hint={`${k.overtime} in overtime`} onClick={() => pick("OVERTIME")} active={status === "OVERTIME"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <Panel title="Live attendance status">
          {sum.error ? <div className="p-4 text-sm text-destructive">Could not load attendance.</div> : (
            <LiveTable rows={rows} tz={tz} statusFilter={status} onStatusFilter={setStatus} pageSize={12} />
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Late arrivals today">
            <ul className="divide-y text-sm">
              {insights.lateList.length === 0 && <li className="px-4 py-3 text-muted-foreground">No late arrivals recorded.</li>}
              {insights.lateList.map((r) => (
                <li key={r.employee_id} className="flex justify-between px-4 py-2.5">
                  <Link to="/attendance/employees/$id" params={{ id: r.employee_id }} className="hover:text-primary">{r.emp.full_name}</Link>
                  <span className="font-mono text-xs text-warning">{fmtTime(r.check_in, tz)} · +{r.late_minutes}m</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Long breaks (> 60m)">
            <ul className="divide-y text-sm">
              {insights.longBreaks.length === 0 && <li className="px-4 py-3 text-muted-foreground">None today.</li>}
              {insights.longBreaks.map((r) => (
                <li key={r.employee_id} className="flex justify-between px-4 py-2.5">
                  <span>{r.emp.full_name}</span><span className="font-mono text-xs text-info">{fmtMinutes(r.break_minutes)}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Expected checkout reached">
            <ul className="divide-y text-sm">
              {insights.dueOut.length === 0 && <li className="px-4 py-3 text-muted-foreground">Nobody has completed expected hours yet.</li>}
              {insights.dueOut.map((r) => (
                <li key={r.employee_id} className="flex justify-between px-4 py-2.5">
                  <span>{r.emp.full_name}</span><span className="font-mono text-xs text-success">{fmtMinutes(r.net_minutes)}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
            Insights are computed from today's recorded check-in, break and check-out events against each employee's assigned rule. Times shown in {tz}.
          </p>
        </div>
      </div>
    </div>
  );
}
