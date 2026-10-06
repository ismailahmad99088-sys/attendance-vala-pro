import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp, ROLE_LABEL } from "@/lib/app-context";
import { errMsg } from "@/lib/attendance";
import { PageHeader, Panel } from "@/components/att/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/attendance/settings")({
  head: () => ({ meta: [{ title: "Settings — Attendance Vala" }, { name: "description", content: "Organization attendance settings." }] }),
  component: SettingsPage,
});

const ZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Karachi", "Asia/Dhaka", "Asia/Singapore", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "UTC"];

function SettingsPage() {
  const app = useApp();
  const qc = useQueryClient();
  const org = useQuery({ queryKey: ["att", "org"], queryFn: async () => (await supabase.from("org_settings").select("*").eq("id", 1).maybeSingle()).data });
  const [f, setF] = useState({ org_name: "", timezone: "UTC" });
  useEffect(() => { if (org.data) setF({ org_name: org.data.org_name, timezone: org.data.timezone }); }, [org.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("org_settings").update({ ...f, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error(errMsg(error));
    toast.success("Settings saved");
    qc.invalidateQueries();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" />
      <Panel title="Organization">
        <form onSubmit={save} className="space-y-4 p-5">
          <div className="space-y-1.5"><Label>Organization name</Label><Input disabled={!app.can.admin} value={f.org_name} onChange={(e) => setF({ ...f, org_name: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Attendance timezone</Label>
            <select disabled={!app.can.admin} className="h-9 w-full rounded-md border bg-transparent px-2 text-sm" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>
              {Array.from(new Set([f.timezone, ...ZONES])).map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">Defines the attendance day, late/early calculations and all displayed times.</p>
          </div>
          {app.can.admin && <Button type="submit">Save</Button>}
        </form>
      </Panel>
      <Panel title="Your account">
        <dl className="grid grid-cols-2 gap-3 p-5 text-sm">
          <dt className="text-muted-foreground">Signed in as</dt><dd>{app.email}</dd>
          <dt className="text-muted-foreground">Roles</dt><dd>{app.roles.map((r) => ROLE_LABEL[r]).join(", ")}</dd>
          <dt className="text-muted-foreground">Linked employee</dt><dd>{app.myEmployeeId ? "Yes" : "None"}</dd>
        </dl>
      </Panel>
    </div>
  );
}
