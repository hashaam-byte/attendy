import { createClient } from "@supabase/supabase-js";

const getEnv = (name: string): string | undefined => {
  const globalAny = globalThis as any;
  return globalAny.Deno?.env?.get?.(name) ?? globalAny.process?.env?.[name];
};

const SUPABASE_URL    = getEnv("REACT_APP_SUPABASE_URL") ?? getEnv("SUPABASE_URL")!;
const SERVICE_KEY     = getEnv("REACT_APP_SUPABASE_SERVICE_ROLE_KEY") ?? getEnv("SUPABASE_SERVICE_ROLE_KEY")!;
const TERMII_API_KEY  = getEnv("REACT_APP_TERMII_API_KEY") ?? getEnv("TERMII_API_KEY");
const TERMII_SENDER   = getEnv("REACT_APP_TERMII_SENDER") ?? getEnv("TERMII_SENDER_ID") ?? "Attendy";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalisePhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("234")) return d;
  if (d.startsWith("0") && d.length === 11) return "234" + d.slice(1);
  return d;
}

async function sendSms(to: string, message: string): Promise<boolean> {
  if (!TERMII_API_KEY) {
    console.log(`[SMS DEV] to=${to} | ${message}`);
    return true;
  }
  try {
    const res = await fetch("https://v3.api.termii.com/api/sms/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TERMII_API_KEY,
        to:      normalisePhone(to),
        from:    TERMII_SENDER,
        sms:     message.slice(0, 160),
        type:    "plain",
        channel: "dnd",
      }),
    });
    return res.ok;
  } catch { return false; }
}

export default async function handler(_req?: unknown) {
  const now            = new Date();
  const sevenDaysOut   = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const today          = now.toISOString().split("T")[0];
  const warningDay     = sevenDaysOut.toISOString().split("T")[0];

  let suspended = 0;
  let warned    = 0;
  const errors: string[] = [];

  // ── 1. Suspend expired active orgs ──────────────────────────
  const { data: expiredOrgs, error: expErr } = await supabase
    .from("organisations")
    .select("id, name, contact_phone, contact_email, slug")
    .eq("is_active", true)
    .not("plan_expires_at", "is", null)
    .lt("plan_expires_at", now.toISOString());

  if (expErr) {
    errors.push(`fetch expired: ${expErr.message}`);
  } else {
    for (const org of expiredOrgs ?? []) {
      // Set is_active = false
      const { error: susErr } = await supabase
        .from("organisations")
        .update({ is_active: false })
        .eq("id", org.id);

      if (susErr) {
        errors.push(`suspend ${org.slug}: ${susErr.message}`);
        continue;
      }

      // Log to audit_logs
      await supabase.from("audit_logs").insert({
        organisation_id: org.id,
        action:          "org_suspended",
        details: {
          reason:    "plan_expired",
          suspended_at: now.toISOString(),
          auto:      true,
        },
        performed_by: null,
      });

      // Send SMS to contact_phone
      if (org.contact_phone) {
        const msg = `Attendy: Your school subscription for ${org.name} has expired and your account has been suspended. Contact us on WhatsApp: +2348077291745 or email: attendyofficial@gmail.com to renew.`;
        await sendSms(org.contact_phone, msg);

        await supabase.from("notifications_log").insert({
          organisation_id: org.id,
          channel:         "sms",
          recipient:       org.contact_phone,
          message:         msg,
          status:          "sent",
        });
      }

      suspended++;
      console.log(`[auto-suspend] Suspended: ${org.slug}`);
    }
  }

  // ── 2. Send 7-day warning to orgs expiring in exactly 7 days ─
  const { data: warningOrgs, error: warnErr } = await supabase
    .from("organisations")
    .select("id, name, contact_phone, slug, plan")
    .eq("is_active", true)
    .not("plan_expires_at", "is", null)
    // expires between today+6 days and today+8 days (catches "today+7" regardless of time)
    .gte("plan_expires_at", new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString())
    .lte("plan_expires_at", new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString());

  if (warnErr) {
    errors.push(`fetch warning: ${warnErr.message}`);
  } else {
    for (const org of warningOrgs ?? []) {
      if (!org.contact_phone) continue;

      const msg = `Attendy: Your ${org.plan} plan for ${org.name} expires in 7 days. Renew now to avoid suspension. WhatsApp: +2348077291745 or email: attendyofficial@gmail.com`;
      const ok  = await sendSms(org.contact_phone, msg);

      await supabase.from("notifications_log").insert({
        organisation_id: org.id,
        channel:         "sms",
        recipient:       org.contact_phone,
        message:         msg,
        status:          ok ? "sent" : "failed",
      });

      // Also log in audit_logs for visibility
      await supabase.from("audit_logs").insert({
        organisation_id: org.id,
        action:          "expiry_warning_sent",
        details:         { days_remaining: 7, auto: true },
        performed_by:    null,
      });

      warned++;
      console.log(`[auto-suspend] Warning sent: ${org.slug}`);
    }
  }

  const result = { suspended, warned, errors, ran_at: now.toISOString() };
  console.log("[auto-suspend] Done:", result);

  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  };
}

