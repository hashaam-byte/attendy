// supabase/functions/absence-alert/index.ts — ATTENDY-EDU
// Deno edge function — uses ESM URLs, NOT npm package names.
// Runs daily via pg_cron at 8 AM WAT (07:00 UTC Mon-Fri).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getEnv = (name: string): string => Deno.env.get(name) ?? "";

const supabase = createClient(
  getEnv("SUPABASE_URL"),
  getEnv("SUPABASE_SERVICE_ROLE_KEY")
);

const TERMII_KEY       = getEnv("TERMII_API_KEY");
const TERMII_SENDER_ID = getEnv("TERMII_SENDER_ID") || "Attendy";
const TERMII_URL       = "https://v3.api.termii.com/api/sms/send";

function normalisePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0"))   cleaned = "234" + cleaned.slice(1);
  if (!cleaned.startsWith("234")) cleaned = "234" + cleaned;
  return cleaned;
}

async function sendSms(to: string, message: string): Promise<boolean> {
  if (!TERMII_KEY) {
    console.log(`[DEV] SMS to ${to}: ${message}`);
    return true;
  }
  try {
    const res = await fetch(TERMII_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TERMII_KEY,
        to,
        from:    TERMII_SENDER_ID,
        sms:     message.slice(0, 160),
        type:    "plain",
        channel: "generic",
      }),
    });
    const data = await res.json();
    if (data?.code === "error") {
      console.error("[SMS] Termii error:", data?.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[SMS] send failed:", e);
    return false;
  }
}

Deno.serve(async (_req: Request) => {
  const today = new Date().toISOString().split("T")[0];
  let totalSent = 0, totalFailed = 0, totalSkipped = 0;

  const { data: orgs, error: orgErr } = await supabase
    .from("organisations")
    .select("id, name, settings, is_active, plan")
    .eq("is_active", true);

  if (orgErr) {
    return new Response(JSON.stringify({ error: orgErr.message }), { status: 500 });
  }

  for (const org of orgs ?? []) {
    const settings = (org.settings as any) ?? {};
    if (!settings.sms_on_absence) { totalSkipped++; continue; }

    const alertTime = settings.absence_alert_time ?? "09:00";
    const [ah, am]  = alertTime.split(":").map(Number);
    const nowWAT    = new Date(Date.now() + 60 * 60 * 1000); // UTC+1 approx
    if (nowWAT.getHours() < ah || (nowWAT.getHours() === ah && nowWAT.getMinutes() < am)) {
      totalSkipped++;
      continue;
    }

    const { data: students } = await supabase
      .from("members")
      .select("id, full_name, parent_phone")
      .eq("organisation_id", org.id)
      .eq("member_type", "student")
      .eq("is_active", true)
      .not("parent_phone", "is", null);

    const { data: scans } = await supabase
      .from("attendance_logs")
      .select("member_id")
      .eq("organisation_id", org.id)
      .eq("scan_type", "entry")
      .gte("scanned_at", `${today}T00:00:00`);

    const scannedIds = new Set((scans ?? []).map((s: any) => s.member_id));

    for (const student of students ?? []) {
      if (scannedIds.has(student.id)) continue;

      const phone   = normalisePhone(student.parent_phone!);
      const message = `Attendy: ${student.full_name} has not been scanned at ${org.name} today (${today}). Please contact the school if this is unexpected.`;

      const sent = await sendSms(phone, message);

      await supabase.from("notifications_log").insert({
        organisation_id:     org.id,
        member_id:           student.id,
        channel:             "sms",
        recipient:           phone,
        message,
        status:              sent ? "sent" : "failed",
        provider_message_id: null,
        error_message:       sent ? null : "Termii send failed",
      });

      // Fire push notification alongside SMS
      const supabaseUrl = getEnv("SUPABASE_URL");
      const serviceKey  = getEnv("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceKey) {
        fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            type:      "absent",
            org_id:    org.id,
            title:     `${student.full_name} is absent`,
            body:      `${student.full_name} has not been scanned at ${org.name} today.`,
            target:    "parent",
            member_id: student.id,
          }),
        }).catch(() => {});
      }

      if (sent) totalSent++; else totalFailed++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent: totalSent, failed: totalFailed, skipped: totalSkipped }),
    { headers: { "Content-Type": "application/json" } }
  );
});