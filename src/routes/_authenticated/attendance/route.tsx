import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, CalendarDays, History, FileEdit, Scale, MapPin, Cpu, FileBarChart,
  ScrollText, Settings, LogOut, Clock3, Fingerprint, ListChecks, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppContext, deriveCan, ROLE_LABEL, type AppCtx, type AppRole } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/attendance")({
  component: AttendanceLayout,
});

const NAV = [
  { to: "/attendance/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/attendance/check-in", label: "Check In / Out", icon: Fingerprint },
  { to: "/attendance/today", label: "Today's Attendance", icon: ListChecks },
  { to: "/attendance/employees", label: "Employees", icon: Users, viewAll: true },
  { to: "/attendance/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/attendance/history", label: "Attendance History", icon: History },
  { to: "/attendance/corrections", label: "Corrections", icon: FileEdit },
  { to: "/attendance/rules", label: "Rules", icon: Scale },
  { to: "/attendance/locations", label: "Locations", icon: MapPin },
  { to: "/attendance/devices", label: "Devices", icon: Cpu, viewAll: true },
  { to: "/attendance/reports", label: "Reports", icon: FileBarChart, viewAll: true },
  { to: "/attendance/audit", label: "Audit Logs", icon: ScrollText, admin: true },
  { to: "/attendance/settings", label: "Settings", icon: Settings },
] as const;

async function loadCtx(): Promise<AppCtx> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("No session");
  const [roles, org, emp] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", u.user.id),
    supabase.from("org_settings").select("org_name, timezone").eq("id", 1).maybeSingle(),
    supabase.from("employees").select("id").eq("user_id", u.user.id).maybeSingle(),
  ]);
  const r = (roles.data ?? []).map((x) => x.role as AppRole);
  return {
    userId: u.user.id,
    email: u.user.email ?? "",
    roles: r,
    tz: org.data?.timezone ?? "UTC",
    orgName: org.data?.org_name ?? "Organization",
    myEmployeeId: emp.data?.id ?? null,
    can: deriveCan(r),
  };
}

function AttendanceLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: ctx, isLoading, error } = useQuery({ queryKey: ["app-ctx"], queryFn: loadCtx, staleTime: 60_000 });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (error || !ctx) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Could not load your account.</p>
          <button onClick={signOut} className="mt-3 text-sm text-primary underline">Sign in again</button>
        </div>
      </div>
    );
  }
  if (ctx.roles.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="font-display text-lg">No attendance role assigned</p>
          <p className="mt-1 text-sm text-muted-foreground">Ask an administrator to grant you access.</p>
          <button onClick={signOut} className="mt-4 text-sm text-primary underline">Sign out</button>
        </div>
      </div>
    );
  }

  const items = NAV.filter((n) => (!("admin" in n) || ctx.can.admin) && (!("viewAll" in n) || ctx.can.viewAll));

  return (
    <AppContext.Provider value={ctx}>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar/80 backdrop-blur-xl md:flex">
          <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
            <div className="glow-primary grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Clock3 className="h-4 w-4" /></div>
            <div className="leading-tight">
              <div className="font-display text-sm font-semibold">Attendance Vala</div>
              <div className="max-w-[150px] truncate text-[11px] text-muted-foreground">{ctx.orgName}</div>
            </div>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
            {items.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium [&>svg]:text-primary" }}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-sidebar-border p-3">
            <div className="truncate text-xs">{ctx.email}</div>
            <div className="text-[11px] text-muted-foreground">{ctx.roles.map((r) => ROLE_LABEL[r]).join(", ")} · {ctx.tz}</div>
            <button onClick={signOut} className="mt-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b bg-sidebar px-2 py-2 md:hidden">
            {items.map((n) => (
              <Link key={n.to} to={n.to} className={cn("shrink-0 rounded px-2.5 py-1.5 text-xs")} activeProps={{ className: "bg-sidebar-accent text-primary" }}>
                {n.label}
              </Link>
            ))}
          </div>
          <main className="mx-auto max-w-[1400px] p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}
