import { supabase } from "@/integrations/supabase/client";

export type DaySummary = {
  employee_id: string;
  check_in: string | null;
  check_out: string | null;
  check_in_method: string | null;
  break_minutes: number;
  on_break: boolean;
  break_started_at: string | null;
  gross_minutes: number | null;
  net_minutes: number | null;
  expected_minutes: number;
  rule_start: string | null;
  rule_end: string | null;
  is_late: boolean;
  late_minutes: number;
  is_early: boolean;
  overtime_minutes: number;
  status: string;
  last_activity: string | null;
  event_count: number;
};

export type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  email: string | null;
  user_id: string | null;
  department_id: string | null;
  rule_id: string | null;
  location_id: string | null;
  photo_url: string | null;
  status: string;
  is_demo: boolean;
  departments?: { name: string } | null;
};

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  NOT_MARKED: { label: "Not marked", cls: "bg-muted text-muted-foreground" },
  PRESENT: { label: "Present", cls: "bg-success/15 text-success" },
  LATE: { label: "Late", cls: "bg-warning/15 text-warning" },
  ON_BREAK: { label: "On break", cls: "bg-info/15 text-info" },
  CHECKED_OUT: { label: "Checked out", cls: "bg-secondary text-secondary-foreground" },
  ABSENT: { label: "Absent", cls: "bg-destructive/15 text-destructive" },
  EARLY_CHECKOUT: { label: "Early checkout", cls: "bg-warning/15 text-warning" },
  OVERTIME: { label: "Overtime", cls: "bg-chart-5/15 text-chart-5" },
  MISSING_CHECKOUT: { label: "Missing checkout", cls: "bg-destructive/15 text-destructive" },
  OFF: { label: "Weekend", cls: "bg-muted/50 text-muted-foreground" },
};

export function fmtMinutes(m: number | null | undefined) {
  if (m == null) return "—";
  const sign = m < 0 ? "-" : "";
  const a = Math.abs(Math.round(m));
  return `${sign}${Math.floor(a / 60)}h ${String(a % 60).padStart(2, "0")}m`;
}

export function fmtTime(iso: string | null | undefined, tz: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
}

export function fmtDateTime(iso: string | null | undefined, tz: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz,
  }).format(new Date(iso));
}

/** Today's date (YYYY-MM-DD) in the organization's timezone. */
export function todayIn(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Something went wrong";
}

export async function fetchDaySummary(date: string) {
  const { data, error } = await supabase.rpc("attendance_day_summary", { _date: date });
  if (error) throw error;
  return (data ?? []) as DaySummary[];
}

export async function fetchRange(from: string, to: string) {
  const { data, error } = await supabase.rpc("attendance_range_summary", { _from: from, _to: to });
  if (error) throw error;
  return data ?? [];
}

export async function fetchEmployees() {
  const { data, error } = await supabase
    .from("employees")
    .select("*, departments(name)")
    .order("employee_code");
  if (error) throw error;
  return (data ?? []) as Employee[];
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
