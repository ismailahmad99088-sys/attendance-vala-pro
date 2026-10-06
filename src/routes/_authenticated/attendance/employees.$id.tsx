import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { fetchDaySummary, fetchRange, fmtMinutes, fmtTime, todayIn } from "@/lib/attendance";
import { useAttendanceRealtime } from "@/hooks/use-attendance-realtime";
import { MonthCalendar } from "@/components/att/MonthCalendar";
import { DemoTag, PageHeader, Panel, StatCard, StatusBadge, Td, Th } from "@/components/att/ui";

export const Route = createFileRoute("/_authenticated/attendance/employees/$id")({
  head: () => ({ meta: [{ title: "Employee Attendance — Attendance Vala" }, { name: "description", content: "Attendance profile and history." }] }),
  component: EmployeeProfile,
});

function EmployeeProfile() {
  const { id } = Route.useParams();
  const { tz } = useApp();
  useAttendanceRealtime();
  const today = todayIn(tz);
  const monthStart = `${today.slice(0, 7)}-01`;
  const emp = useQuery({
    queryKey: ["att", "emp", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*, departments(name), attendance_rules(name,start_time,end_time)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const day = useQuery({ queryKey: ["att", "day", today], queryFn: () => fetchDaySummary(today) });
  const month = useQuery({ queryKey: ["att", "range", monthStart, today], queryFn: () => fetchRange(monthStart, today) });
  const s = day.data?.find((x) => x.employee_id === id);
  const mine = useMemo(() => (month.data ?? []).filter((r) => r.employee_id === id), [month.data, id]);
  const m = useMemo(() => {
    const work = mine.filter((r) => r.status !== "OFF");
    return {
      working: work.length,
      present: work.filter((r) => r.check_in).length,
      absent: work.filter((r) => r.status === "ABSENT").length,
      late: work.filter((r) => r.is_late).length,
      early: work.filter((r) => r.is_early).length,
      hours: work.reduce((a, r) => a + (r.net_minutes ?? 0), 0),
      ot: work.reduce((a, r) => a + (r.overtime_minutes ?? 0), 0),
    };
  }, [mine]);

  if (emp.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!emp.data) return <div className="text-sm text-muted-foreground">Employee not found or not visible to you.</div>;
  const e = emp.data;

  return (
    <div>
      <Link to="/attendance/employees" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Employees</Link>
      <PageHeader
        title={e.full_name}
        sub={<span className="flex items-center gap-2 font-mono">{e.employee_code} · {e.departments?.name ?? "No team"} · {e.attendance_rules ? `${e.attendance_rules.name} (${e.attendance_rules.start_time.slice(0, 5)}–${e.attendance_rules.end_time.slice(0, 5)})` : "No rule"} {e.is_demo && <DemoTag />}</span>}
        actions={<StatusBadge status={s?.status ?? "NOT_MARKED"} />}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Today's check-in" value={fmtTime(s?.check_in, tz)} tone={s?.is_late ? "warning" : "success"} hint={s?.is_late ? `${s.late_minutes} min late` : undefined} />
        <StatCard label="Today's check-out" value={fmtTime(s?.check_out, tz)} />
        <StatCard label="Working time" value={fmtMinutes(s?.net_minutes)} tone="info" />
        <StatCard label="Month hours" value={fmtMinutes(m.hours)} tone="violet" hint={`${fmtMinutes(m.ot)} overtime`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel title="Attendance calendar"><div className="p-4"><MonthCalendar employeeId={id} tz={tz} /></div></Panel>
        <Panel title="This month">
          <div className="grid grid-cols-3 gap-2 p-4 text-sm">
            {[["Working days", m.working], ["Present", m.present], ["Absent", m.absent], ["Late", m.late], ["Early checkout", m.early], ["Overtime", fmtMinutes(m.ot)]].map(([k, v]) => (
              <div key={k as string} className="rounded border bg-muted/20 p-3"><div className="text-[11px] uppercase text-muted-foreground">{k}</div><div className="mt-1 font-display text-xl font-semibold tabular">{v}</div></div>
            ))}
          </div>
          <div className="max-h-80 overflow-y-auto border-t">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b bg-card"><tr><Th>Date</Th><Th>In</Th><Th>Out</Th><Th>Net</Th><Th>Status</Th></tr></thead>
              <tbody className="divide-y">
                {[...mine].reverse().filter((r) => r.status !== "OFF").map((r) => (
                  <tr key={r.work_date}><Td className="font-mono text-xs">{r.work_date}</Td><Td className="font-mono">{fmtTime(r.check_in, tz)}</Td><Td className="font-mono">{fmtTime(r.check_out, tz)}</Td><Td className="font-mono">{fmtMinutes(r.net_minutes)}</Td><Td><StatusBadge status={r.status} /></Td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
