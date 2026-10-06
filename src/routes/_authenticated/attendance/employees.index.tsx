import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { fetchDaySummary, fetchEmployees, fmtTime, todayIn } from "@/lib/attendance";
import { DemoTag, Empty, PageHeader, Panel, StatusBadge, Td, Th } from "@/components/att/ui";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/attendance/employees/")({
  head: () => ({ meta: [{ title: "Employees — Attendance Vala" }, { name: "description", content: "Employee attendance profiles." }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { tz } = useApp();
  const today = todayIn(tz);
  const [q, setQ] = useState("");
  const emps = useQuery({ queryKey: ["att", "emps"], queryFn: fetchEmployees });
  const sum = useQuery({ queryKey: ["att", "day", today], queryFn: () => fetchDaySummary(today) });
  const sm = useMemo(() => new Map((sum.data ?? []).map((s) => [s.employee_id, s])), [sum.data]);
  const list = (emps.data ?? []).filter((e) => !q || `${e.full_name} ${e.employee_code}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Employees" sub={`${emps.data?.length ?? 0} registered`} actions={<Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-64" />} />
      <Panel>
        {list.length === 0 ? <Empty>{emps.isLoading ? "Loading…" : "No employees found."}</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30"><tr><Th>Employee</Th><Th>ID</Th><Th>Team</Th><Th>Today</Th><Th>Check-in</Th><Th>Check-out</Th></tr></thead>
              <tbody className="divide-y">
                {list.map((e) => {
                  const s = sm.get(e.id);
                  return (
                    <tr key={e.id} className="hover:bg-muted/20">
                      <Td><Link to="/attendance/employees/$id" params={{ id: e.id }} className="font-medium hover:text-primary">{e.full_name}</Link></Td>
                      <Td className="font-mono text-xs"><span className="flex items-center gap-1.5">{e.employee_code} {e.is_demo && <DemoTag />}</span></Td>
                      <Td className="text-muted-foreground">{e.departments?.name ?? "—"}</Td>
                      <Td><StatusBadge status={e.status === "ACTIVE" ? s?.status ?? "NOT_MARKED" : "OFF"} /></Td>
                      <Td className="font-mono">{fmtTime(s?.check_in, tz)}</Td>
                      <Td className="font-mono">{fmtTime(s?.check_out, tz)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
