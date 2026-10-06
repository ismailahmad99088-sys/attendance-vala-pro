import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const LoginInput = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
  licenseKey: z.string().trim().min(1).max(40),
  backupKey: z.string().trim().min(1).max(40),
});

export type LoginResult =
  | { ok: true; access_token: string; refresh_token: string }
  | { ok: false; code: "INVALID_CREDENTIALS" | "INVALID_LICENSE" | "LOCKED" | "NO_ACCESS" | "SERVER_ERROR"; message: string };

const MAX_FAILS = 5;
const WINDOW_MIN = 15;

export const loginWithLicense = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LoginInput.parse(d))
  .handler(async ({ data }): Promise<LoginResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const fail = async (reason: string) => {
      await supabaseAdmin.from("login_attempts").insert({ email, success: false, reason });
    };

    try {
      const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
      const { count } = await supabaseAdmin
        .from("login_attempts")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .eq("success", false)
        .gte("created_at", since);
      if ((count ?? 0) >= MAX_FAILS) {
        return { ok: false, code: "LOCKED", message: `Too many failed attempts. Try again in ${WINDOW_MIN} minutes.` };
      }

      const { data: licOk, error: licErr } = await supabaseAdmin.rpc("verify_license", {
        _key: data.licenseKey,
        _backup: data.backupKey,
      });
      if (licErr) throw licErr;
      if (!licOk) {
        await fail("INVALID_LICENSE");
        return { ok: false, code: "INVALID_LICENSE", message: "License key or backup key is not valid." };
      }

      // Provision the demo super admin through real auth (password from server secret only).
      const demoEmail = (process.env["DEMO_ADMIN_EMAIL"] ?? "").toLowerCase();
      const demoPass = process.env["DEMO_ADMIN_PASSWORD"] ?? "";
      if (demoEmail && email === demoEmail && data.password === demoPass) {
        const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
          email: demoEmail,
          password: demoPass,
          email_confirm: true,
        });
        let userId = created?.user?.id;
        if (cErr && !userId) {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          userId = list?.users.find((u) => u.email?.toLowerCase() === demoEmail)?.id;
        }
        if (userId) {
          await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "super_admin" }, { onConflict: "user_id,role" });
        }
      }

      const url = process.env["SUPABASE_URL"]!;
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
      const pub = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) => {
            const h = new Headers(init?.headers);
            if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
            h.set("apikey", key);
            return fetch(input, { ...init, headers: h });
          },
        },
      });
      const { data: signIn, error: sErr } = await pub.auth.signInWithPassword({ email, password: data.password });
      if (sErr || !signIn.session) {
        await fail("INVALID_CREDENTIALS");
        return { ok: false, code: "INVALID_CREDENTIALS", message: "Username or password is incorrect." };
      }

      const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", signIn.user.id);
      if (!roles || roles.length === 0) {
        await fail("NO_ACCESS");
        return { ok: false, code: "NO_ACCESS", message: "This account has no attendance role assigned." };
      }

      await supabaseAdmin.from("login_attempts").insert({ email, success: true });
      await supabaseAdmin.from("attendance_audit_logs").insert({
        actor_id: signIn.user.id,
        actor_email: email,
        action: "LOGIN",
        entity: "auth",
        details: { license: "validated" },
      });

      return { ok: true, access_token: signIn.session.access_token, refresh_token: signIn.session.refresh_token };
    } catch (e) {
      console.error("login failed", e);
      return { ok: false, code: "SERVER_ERROR", message: "Sign-in is temporarily unavailable. Please try again." };
    }
  });
