import { createContext, useContext } from "react";

export type AppRole =
  | "super_admin" | "attendance_admin" | "attendance_manager" | "supervisor" | "employee" | "viewer";

export type AppCtx = {
  userId: string;
  email: string;
  roles: AppRole[];
  tz: string;
  orgName: string;
  myEmployeeId: string | null;
  can: {
    viewAll: boolean;
    operate: boolean;
    admin: boolean;
    approve: boolean;
  };
};

export const AppContext = createContext<AppCtx | null>(null);

export function useApp() {
  const v = useContext(AppContext);
  if (!v) throw new Error("useApp outside AppContext");
  return v;
}

export function deriveCan(roles: AppRole[]) {
  const has = (...r: AppRole[]) => r.some((x) => roles.includes(x));
  return {
    viewAll: has("super_admin", "attendance_admin", "attendance_manager", "supervisor", "viewer"),
    operate: has("super_admin", "attendance_admin", "attendance_manager", "supervisor"),
    admin: has("super_admin", "attendance_admin"),
    approve: has("super_admin", "attendance_admin", "attendance_manager"),
  };
}

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  attendance_admin: "Attendance Admin",
  attendance_manager: "Attendance Manager",
  supervisor: "Supervisor",
  employee: "Employee",
  viewer: "Viewer",
};
