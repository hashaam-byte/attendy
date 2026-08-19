// supabase/functions/plan-expiry-reminder/index.ts — ATTENDY-EDU
// Deno edge function — uses ESM URLs, NOT npm package names.
// Runs once daily via pg_cron (recommend 9 AM WAT / 08:00 UTC).
//
// Checks every active org's plan_expires_at and sends a reminder at
// exactly 7, 3, and 1 days before expiry, plus on the expiry day
// itself — to that org's admins (in-app push, reusing send-push) and
// to you (SMS, so you know who to reach out to before they lapse).
// Matching on exact day-counts (not "within N days") keeps this
// naturally idempotent for a once-a-day cron without needing a
// separate dedup table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getEnv = (n: string): string => Deno.env.get(n) ?? "";

const supabase = createClient(
  getEnv("SUPABASE_URL"),
  getEnv("SUPABASE_SERVICE_ROLE_KEY")
);

const TERMII_KEY       = getEnv("TERMII_API_KEY");
const TERMII_SENDER_ID = getEnv("TERMII_SENDER_ID") || "Attendy";
const TERMII_URL       = "https://v3.api.termii.com/api/sms/send";

// Your own number, to get a heads-up on renewals worth a personal follow-up.
// Set this as a secret: `supabase secrets set PLATFORM_ADMIN_PHONE=234...`
const PLATFORM_ADMIN_PHONE = getEnv("PLATFORM_ADMIN_PHONE");

const REMINDER_DAYS = [7, 3, 1, 0]; // 0 = expires today

async function sendSms(to: string, message: string): Promise<void> {
  if (!TERMII_KEY) { console.log(`[DEV] SMS to ${to}: ${message}`); return; }
  try {
    await fetch(TERMII_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TERMII_KEY, to, from: TERMII_SENDER_ID,
        sms: message.slice(0, 160), type: "plain", channel: "generic",
      }),
    });
  } catch (e) {
    console.error("[SMS] send failed:", e);
  }
}

async function sendAdminPush(orgId: string, title: string, body: string): Promise<void> {
  try {
    await fetch(`${getEnv("SUPABASE_URL")}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getEnv("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ type: "plan_expiry", org_id: orgId, target: "admins", title, body }),
    });
  } catch (e) {
    console.error("[PLAN REMINDER] push failed:", e);
  }
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00Z").getTime();
  const today  = new Date(new Date().toISOString().split("T")[0] + "T00:00:00Z").getTime();
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
}

Deno.serve(async (_req: Request) => {
  const { data: orgs } = await supabase
    .from("organisations")
    .select("id, name, plan, plan_expires_at")
    .eq("is_active", true)
    .not("plan_expires_at", "is", null);

  let notified = 0;

  for (const org of orgs ?? []) {
    const days = daysUntil(org.plan_expires_at);
    if (!REMINDER_DAYS.includes(days)) continue;

    const humanWhen = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;

    await sendAdminPush(
      org.id,
      "Plan renewal reminder",
      `Your Attendy ${org.plan ?? ""} plan expires ${humanWhen}. Renew to avoid interruption.`
    );

    if (PLATFORM_ADMIN_PHONE) {
      await sendSms(
        PLATFORM_ADMIN_PHONE,
        `[Attendy] ${org.name} (${org.plan ?? "plan"}) expires ${humanWhen} (${org.plan_expires_at}).`
      );
    }

    notified++;
  }

  return new Response(
    JSON.stringify({ checked: (orgs ?? []).length, notified }),
    { headers: { "Content-Type": "application/json" } }
  );
});