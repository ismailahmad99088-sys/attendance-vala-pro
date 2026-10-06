import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loginWithLicense } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Attendance Vala" },
      { name: "description", content: "Sign in to Attendance Vala with your license key." },
      { property: "og:title", content: "Sign in — Attendance Vala" },
      { property: "og:description", content: "Secure licensed sign-in for Attendance Vala." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { expired?: string } => (s["expired"] === "1" ? { expired: "1" } : {}),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { expired } = Route.useSearch();
  const login = useServerFn(loginWithLicense);
  const [form, setForm] = useState({ email: "", password: "", licenseKey: "", backupKey: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    expired ? { code: "EXPIRED", message: "Your session expired. Please sign in again." } : null,
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/attendance/dashboard", replace: true });
    });
  }, [navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login({ data: form });
      if (!res.ok) {
        setError({ code: res.code, message: res.message });
        return;
      }
      const { error: sErr } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      if (sErr) throw sErr;
      navigate({ to: "/attendance/dashboard", replace: true });
    } catch {
      setError({ code: "SERVER_ERROR", message: "Please check your details and try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r bg-sidebar p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(var(--color-foreground)_1px,transparent_1px),linear-gradient(90deg,var(--color-foreground)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">Attendance Vala</div>
            <div className="text-xs text-muted-foreground">by Software Vala</div>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-5xl font-semibold leading-[1.05]">
            Every punch,<br />server-verified.
          </h1>
          <p className="mt-5 text-muted-foreground">
            Check-ins, breaks and check-outs are stamped by the server, measured against your rules, and
            kept in an immutable history.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3 font-mono text-xs">
            {["CHECK_IN", "BREAK", "CHECK_OUT"].map((t, i) => (
              <div key={t} className="rounded-md border bg-card/50 p-3">
                <div className="text-muted-foreground">0{i + 1}</div>
                <div className="mt-1 text-primary">{t}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-muted-foreground">Licensed access · Audited · Role-based</div>
      </aside>

      <main className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="font-display text-2xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use your account and organization license.</p>
          </div>

          {error && (
            <div
              role="alert"
              className={`rounded-md border px-3 py-2 text-sm ${
                error.code === "LOCKED" || error.code === "EXPIRED"
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {error.message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Username</Label>
            <Input id="email" type="email" autoComplete="username" required value={form.email} onChange={set("email")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={form.password}
                onChange={set("password")}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lic">License key</Label>
              <Input id="lic" required placeholder="0000-0000-0000" className="font-mono" value={form.licenseKey} onChange={set("licenseKey")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk">Backup key</Label>
              <Input id="bk" required placeholder="0000-0000-0000" className="font-mono" value={form.backupKey} onChange={set("backupKey")} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {loading ? "Verifying…" : "Sign in"}
          </Button>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> License validated on the server. 5 failed attempts lock sign-in for 15 minutes.
          </p>
        </form>
      </main>
    </div>
  );
}
