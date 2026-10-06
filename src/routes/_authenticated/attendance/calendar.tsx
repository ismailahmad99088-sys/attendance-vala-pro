import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { fetchEmployees } from "@/lib/attendance";
import { MonthCalendar } from "@/components/att/MonthCalendar";
import { PageHeader, Panel } from "@/components/att/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/attendance/calendar")({
  head: () => ({ meta: [{ title: "Attendance Calendar — Attendance Vala" }, { name: "description", content: "Monthly attendance calendar." }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { tz, myEmployeeId } = useApp();
  const emps = useQuery({ queryKey: ["att", "emps"], queryFn: fetchEmployees });
  const [emp, setEmp] = useState(myEmployeeId ?? "");
  useEffect(() => { if (!emp && emps.data?.[0]) setEmp(emps.data[0].id); }, [emps.data, emp]);
  return (
    <div>
      <PageHeader title="Attendance calendar" sub="Click a day for check-in, breaks, check-out and correction history."
        actions={
          <Select value={emp} onValueChange={setEmp}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>{(emps.data ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name} · {e.employee_code}</SelectItem>)}</SelectContent>
          </Select>
        } />
      <Panel><div className="mx-auto max-w-3xl p-5">{emp ? <MonthCalendar employeeId={emp} tz={tz} /> : <p className="text-sm text-muted-foreground">Select an employee.</p>}</div></Panel>
    </div>
  );
}
