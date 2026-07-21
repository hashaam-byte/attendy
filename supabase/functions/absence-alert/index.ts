import { createClient } from "@supabase/supabase-js";

const getEnv = (name: string) => {
  const globalAny = globalThis as any;
  return globalAny.Deno?.env?.get?.(name) ?? globalAny.process?.env?.[name];
};

const supabase = createClient(
  getEnv("SUPABASE_URL") ?? "",
  getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const TERMII_KEY = getEnv("TERMII_API_KEY") ?? "";
const TERMII_SENDER_ID = getEnv("TERMII_SENDER_ID") ?? "Attendy";
// ── Normalise phone to 234XXXXXXXXXX ───────────────────────────
function normalisePhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("234")) return d;
  if (d.startsWith("0") && d.length === 11) return "234" + d.slice(1);
  return d;
}

// ── Send SMS via Termii (generic channel only) ──────────────────
// Generic works for all Nigerian numbers without a registered sender ID.
// DND channel is not used — requires NCC approval per network.
async function sendSms(to: string, message: string): Promise<boolean> {
  if (!TERMII_KEY) {
    console.log(`[DEV] SMS to ${to}: ${message}`);
    return true;
  }
  try {
    const res = await fetch("https://v3.api.termii.com/api/sms/send", {
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

// ── Main handler ────────────────────────────────────────────────
serve(async (_req: Request) => {
  const today     = new Date().toISOString().split("T")[0];
  const todayDow  = new Date().getDay(); // 0=Sun … 6=Sat

  console.log(`[absence-alert] Running for ${today} (DOW=${todayDow})`);

  // Fetch all active education orgs that have SMS on absence enabled
  const { data: orgs, error: orgErr } = await supabase
    .from("organisations")
    .select("id, name, settings")
    .eq("industry",  "education")
    .eq("is_active", true);

  if (orgErr || !orgs) {
    console.error("[absence-alert] Failed to fetch orgs:", orgErr?.message);
    return new Response(JSON.stringify({ error: orgErr?.message }), { status: 500 });
  }

  let totalSent    = 0;
  let totalSkipped = 0;
  let totalFailed  = 0;

  for (const org of orgs) {
    const settings      = (org.settings as any) ?? {};
    const smsOnAbsence  = settings.sms_on_absence  ?? true;
    const schoolDays    = (settings.school_days     ?? [1, 2, 3, 4, 5]) as number[];

    // Skip if SMS on absence is disabled for this org
    if (!smsOnAbsence) { totalSkipped++; continue; }

    // Skip if today is not a school day for this org
    if (!schoolDays.includes(todayDow)) {
      console.log(`[absence-alert] ${org.name}: today is not a school day, skipping`);
      continue;
    }

    // Fetch all active students for this org
    const { data: students } = await supabase
      .from("members")
      .select("id, full_name, parent_phone")
      .eq("organisation_id", org.id)
      .eq("member_type",     "student")
      .eq("is_active",       true)
      .not("parent_phone",   "is", null);

    if (!students || students.length === 0) continue;

    // Fetch today's entry scans for this org
    const { data: scans } = await supabase
      .from("attendance_logs")
      .select("member_id")
      .eq("organisation_id", org.id)
      .eq("scan_type",       "entry")
      .gte("scanned_at",     `${today}T00:00:00`);

    const scannedIds = new Set((scans ?? []).map((s: any) => s.member_id));

    // Process absent students
    for (const student of students) {
      if (scannedIds.has(student.id)) continue; // present — skip

      const phone = normalisePhone(student.parent_phone!);
      const message =
        `Attendy: ${student.full_name} has not been scanned at ${org.name} today (${today}). ` +
        `Please contact the school if this is unexpected.`;

      const sent = await sendSms(phone, message);

      // Log to notifications_log
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

      // Send push notification to parent alongside SMS
      // Fire-and-forget — never block the SMS loop on push failures
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
            body:      `${student.full_name} has not been scanned at ${org.name} today. Contact the school if unexpected.`,
            target:    "parent",
            member_id: student.id,
          }),
        }).catch(() => {}); // silently ignore push failures
      }

      if (sent) totalSent++;
      else      totalFailed++;
    }
  }

  const summary = {
    date:    today,
    orgs:    orgs.length,
    sent:    totalSent,
    skipped: totalSkipped,
    failed:  totalFailed,
  };

  console.log("[absence-alert] Done:", summary);
  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});

function serve(arg0: (_req: Request) => Promise<Response>) {
  throw new Error("Function not implemented.");
}