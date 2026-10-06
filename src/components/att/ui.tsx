import type { ReactNode } from "react";
import { STATUS_META } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap", m.cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label, value, hint, tone = "default", onClick, active,
}: {
  label: string; value: ReactNode; hint?: string | undefined;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "violet";
  onClick?: (() => void) | undefined; active?: boolean | undefined;
}) {
  const bar = {
    default: "bg-foreground/30", success: "bg-success", warning: "bg-warning",
    danger: "bg-destructive", info: "bg-info", violet: "bg-chart-5",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "surface-3d tilt-3d relative overflow-hidden rounded-xl border p-4 text-left",
        active && "glow-primary border-primary",
      )}
    >
      <span className={cn("absolute left-0 top-0 h-full w-1", bar)} />
      <span className={cn("pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl", bar)} />
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-semibold tabular">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </button>
  );
}

export function Panel({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("surface-3d rounded-xl border", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="font-display text-sm font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-12 text-center text-sm text-muted-foreground">{children}</div>;
}

export function DemoTag() {
  return <span className="rounded border border-warning/40 px-1 text-[10px] font-medium uppercase text-warning">Demo</span>;
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2.5 whitespace-nowrap", className)}>{children}</td>;
}
