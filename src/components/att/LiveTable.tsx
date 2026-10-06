import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_META, fmtMinutes, fmtTime, type DaySummary, type Employee } from "@/lib/attendance";
import { DemoTag, Empty, StatusBadge, Td, Th } from "./ui";

export type Row = DaySummary & { emp: Employee };

export function joinRows(summary: DaySummary[], emps: Employee[]): Row[] {
  const map = new Map(emps.map((e) => [e.id, e]));
  return summary.filter((s) => map.has(s.employee_id)).map((s) => ({ ...s, emp: map.get(s.employee_id)! }));
}

type SortKey = "name" | "check_in" | "net" | "status";

export function LiveTable({
  rows, tz, statusFilter, onStatusFilter, pageSize = 15,
}: {
  rows: Row[]; tz: string; statusFilter?: string; onStatusFilter?: (s: string) => void; pageSize?: number;
}) {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "name", dir: 1 });
  const [page, setPage] = useState(0);
  const status = statusFilter ?? "all";

  const depts = useMemo(() => Array.from(new Set(rows.map((r) => r.emp.departments?.name).filter(Boolean))) as string[], [rows]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    const out = rows.filter((r) =>
      (!ql || r.emp.full_name.toLowerCase().includes(ql) || r.emp.employee_code.toLowerCase().includes(ql)) &&
      (dept === "all" || r.emp.departments?.name === dept) &&
      (status === "all" || r.status === status || (status === "LATE" && r.is_late)),
    );
    const val = (r: Row) =>
      sort.k === "name" ? r.emp.full_name : sort.k === "check_in" ? r.check_in ?? "~" : sort.k === "net" ? r.net_minutes ?? -1 : r.status;
    return out.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [rows, q, dept, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const toggle = (k: SortKey) => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }));
  const SortBtn = ({ k, children }: { k: SortKey; children: string }) => (
    <button onClick={() => toggle(k)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
      {children} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b p-3">
        <Input placeholder="Search name or ID…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className="h-8 max-w-xs" />
        <Select value={dept} onValueChange={(v) => { setDept(v); setPage(0); }}>
          <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        {onStatusFilter && (
          <Select value={status} onValueChange={(v) => { onStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto self-center text-xs text-muted-foreground">{filtered.length} employees</div>
      </div>
      {view.length === 0 ? <Empty>No employees match these filters.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <Th><SortBtn k="name">Employee</SortBtn></Th>
                <Th>Team</Th>
                <Th><SortBtn k="status">Status</SortBtn></Th>
                <Th><SortBtn k="check_in">Check-in</SortBtn></Th>
                <Th>Break</Th>
                <Th>Check-out</Th>
                <Th><SortBtn k="net">Worked</SortBtn></Th>
                <Th>Expected</Th>
                <Th>Difference</Th>
                <Th>Last activity</Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {view.map((r) => {
                const diff = r.net_minutes == null ? null : r.net_minutes - r.expected_minutes;
                return (
                  <tr key={r.employee_id} className="hover:bg-muted/20">
                    <Td>
                      <Link to="/attendance/employees/$id" params={{ id: r.employee_id }} className="group flex items-center gap-2.5">
                        <div className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-[11px] font-semibold">
                          {r.emp.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div className="font-medium group-hover:text-primary">{r.emp.full_name}</div>
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">{r.emp.employee_code} {r.emp.is_demo && <DemoTag />}</div>
                        </div>
                      </Link>
                    </Td>
                    <Td className="text-muted-foreground">{r.emp.departments?.name ?? "—"}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <StatusBadge status={r.status} />
                        {r.is_late && r.status !== "LATE" && <span className="text-[11px] text-warning">late {r.late_minutes}m</span>}
                      </div>
                    </Td>
                    <Td className="font-mono tabular">{fmtTime(r.check_in, tz)}</Td>
                    <Td className="font-mono tabular text-muted-foreground">
                      {r.on_break ? <span className="text-info">since {fmtTime(r.break_started_at, tz)}</span> : r.break_minutes ? fmtMinutes(r.break_minutes) : "—"}
                    </Td>
                    <Td className="font-mono tabular">{fmtTime(r.check_out, tz)}</Td>
                    <Td className="font-mono tabular">{fmtMinutes(r.net_minutes)}</Td>
                    <Td className="font-mono tabular text-muted-foreground">{fmtMinutes(r.expected_minutes)}</Td>
                    <Td className={`font-mono tabular ${diff == null ? "" : diff >= 0 ? "text-success" : "text-muted-foreground"}`}>
                      {diff == null ? "—" : `${diff >= 0 ? "+" : ""}${fmtMinutes(diff)}`}
                    </Td>
                    <Td className="font-mono text-xs text-muted-foreground">{fmtTime(r.last_activity, tz)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t p-2 text-xs">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Prev</button>
          <span className="text-muted-foreground">Page {page + 1} / {pages}</span>
          <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
