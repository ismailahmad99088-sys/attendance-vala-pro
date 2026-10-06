import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchRange, fmtMinutes, fmtTime, STATUS_META, todayIn } from "@/lib/attendance";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "./ui";
import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  PRESENT: "bg-success", CHECKED_OUT: "bg-success", OVERTIME: "bg-chart-5", LATE: "bg-warning",
  EARLY_CHECKOUT: "bg-warning", ABSENT: "bg-destructive", MISSING_CHECKOUT: "bg-destructive",
  ON_BREAK: "bg-info", NOT_MARKED: "bg-muted-foreground/40", OFF: "bg-transparent",
};

function ym(d: string) { return d.slice(0, 7); }

export function MonthCalendar({ employeeId, tz }: { employeeId: string; tz: string }) {
  const today = todayIn(tz);
  const [month, setMonth] = useState(ym(today));
  const [open, setOpen] = useState<string | null>(null);
  const [y = 2000, m = 1] = month.split("-").map(Number);
  const first = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${month}-${String(lastDay).padStart(2, "0")}`;
  const to = last > today ? today : last;

  const q = useQuery({
    queryKey: ["att", "range", first, to],
    queryFn: () => (first > today ? Promise.resolve([]) : fetchRange(first, to)),
  });
  const days = useMemo(() => {
    const map = new Map((q.data ?? []).filter((r) => r.employee_id === employeeId).map((r) => [r.work_date, r]));
    return map;
  }, [q.data, employeeId]);

  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  const sel = open ? days.get(open) : undefined;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="rounded border p-1.5 hover:bg-accent" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
        <div className="font-display font-semibold">{label}</div>
        <button onClick={() => shift(1)} className="rounded border p-1.5 hover:bg-accent" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: lastDay }).map((_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const r = days.get(date);
          const future = date > today;
          return (
            <button
              key={date}
              disabled={future || !r}
              onClick={() => setOpen(date)}
              className={cn(
                "flex aspect-square flex-col items-start justify-between rounded-md border p-1.5 text-left text-xs transition-colors",
                future ? "opacity-30" : "hover:border-foreground/40",
                date === today && "border-primary",
              )}
            >
              <span className="font-mono">{i + 1}</span>
              {r && r.status !== "OFF" && (
                <span className="flex w-full items-center gap-1">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT[r.status])} />
                  <span className="hidden truncate text-[10px] text-muted-foreground sm:inline">{STATUS_META[r.status]?.label}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {["PRESENT", "LATE", "EARLY_CHECKOUT", "OVERTIME", "ABSENT", "MISSING_CHECKOUT", "NOT_MARKED"].map((s) => (
          <span key={s} className="flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", DOT[s])} />{STATUS_META[s]?.label}</span>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{open}</DialogTitle></DialogHeader>
          {open && sel && <DayDetail employeeId={employeeId} date={open} tz={tz} summary={sel} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DayDetail({ employeeId, date, tz, summary }: { employeeId: string; date: string; tz: string; summary: Awaited<ReturnType<typeof fetchRange>>[number] }) {
  const ev = useQuery({
    queryKey: ["att", "events", employeeId, date],
    queryFn: async () => {
      const [e, v, c] = await Promise.all([
        supabase.from("attendance_events").select("*").eq("employee_id", employeeId).eq("work_date", date).order("occurred_at"),
        supabase.from("attendance_event_voids").select("event_id"),
        supabase.from("attendance_corrections").select("*").eq("employee_id", employeeId).eq("work_date", date).order("created_at"),
      ]);
      const voided = new Set((v.data ?? []).map((x) => x.event_id));
      return { events: e.data ?? [], voided, corrections: c.data ?? [] };
    },
  });
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between"><StatusBadge status={summary.status} /><span className="text-xs text-muted-foreground">Method: {summary.check_in_method ?? "—"}</span></div>
      <div className="grid grid-cols-3 gap-2">
        {[["Check-in", fmtTime(summary.check_in, tz)], ["Check-out", fmtTime(summary.check_out, tz)], ["Breaks", fmtMinutes(summary.break_minutes)],
          ["Gross", fmtMinutes(summary.gross_minutes)], ["Net", fmtMinutes(summary.net_minutes)], ["Overtime", fmtMinutes(summary.overtime_minutes)]].map(([k, v]) => (
          <div key={k} className="rounded border bg-muted/20 p-2"><div className="text-[10px] uppercase text-muted-foreground">{k}</div><div className="font-mono">{v}</div></div>
        ))}
      </div>
      <div>
        <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Event log</div>
        <ul className="divide-y rounded border">
          {(ev.data?.events ?? []).map((e) => (
            <li key={e.id} className={cn("flex justify-between px-3 py-1.5 font-mono text-xs", ev.data?.voided.has(e.id) && "text-muted-foreground line-through")}>
              <span>{e.event_type}</span><span>{e.source}</span><span>{fmtTime(e.occurred_at, tz)}</span>
            </li>
          ))}
          {ev.data && ev.data.events.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">No events.</li>}
        </ul>
      </div>
      {(ev.data?.corrections.length ?? 0) > 0 && (
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Correction history</div>
          <ul className="space-y-1 text-xs">
            {ev.data!.corrections.map((c) => (
              <li key={c.id} className="rounded border px-3 py-1.5">{c.correction_type} → {fmtTime(c.requested_value, tz)} · <b>{c.status}</b> · {c.reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
