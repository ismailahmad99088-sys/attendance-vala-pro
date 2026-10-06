import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { downloadCsv, fetchDaySummary, fetchEmployees, fmtTime, todayIn } from "@/lib/attendance";
import { useAttendanceRealtime } from "@/hooks/use-attendance-realtime";
import { LiveTable, joinRows } from "@/components/att/LiveTable";
import { PageHeader, Panel } from "@/components/att/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/attendance/today")({
  head: () => ({ meta: [{ title: "Daily Attendance — Attendance Vala" }, { name: "description", content: "Daily attendance by employee." }] }),
  component: TodayPage,
});

function TodayPage() {
  const { tz } = useApp();
  useAttendanceRealtime();
  const [date, setDate] = useState(todayIn(tz));
  const [status, setStatus] = useState("all");
  const emps = useQuery({ queryKey: ["att", "emps"], queryFn: fetchEmployees });
  const sum = useQuery({ queryKey: ["att", "day", date], queryFn: () => fetchDaySummary(date) });
  const rows = useMemo(() => joinRows(sum.data ?? [], emps.data ?? []), [sum.data, emps.data]);

  return (
    <div>
      <PageHeader
        title="Daily attendance"
        sub={`All times in ${tz}`}
        actions={<>
          <Input type="date" value={date} max={todayIn(tz)} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 w-44" />
          <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => downloadCsv(`attendance-${date}.csv`, rows.map((r) => ({
            employee: r.emp.full_name, id: r.emp.employee_code, team: r.emp.departments?.name ?? "", date,
            check_in: fmtTime(r.check_in, tz), check_out: fmtTime(r.check_out, tz), gross_min: r.gross_minutes ?? "", break_min: r.break_minutes,
            net_min: r.net_minutes ?? "", late: r.is_late ? r.late_minutes : 0, early_checkout: r.is_early, overtime_min: r.overtime_minutes,
            method: r.check_in_method ?? "", status: r.status,
          })))}>Export CSV</Button>
        </>}
      />
      <Panel>
        {sum.isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div> :
          <LiveTable rows={rows} tz={tz} statusFilter={status} onStatusFilter={setStatus} pageSize={20} />}
      </Panel>
    </div>
  );
}
