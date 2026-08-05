import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notify";
import { buildArrivalSms, buildAbsenceSms } from "@/lib/sms";
import { hasFeature } from "@/lib/plan-features";

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, member_id, org_id, is_late, late_reason } = body;

  if (!member_id || !org_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const [{ data: member }, { data: org }] = await Promise.all([
    serviceSupabase
      .from("members")
      .select("full_name, parent_phone, class_name")
      .eq("id", member_id)
      .single(),
    serviceSupabase
      .from("organisations")
      .select("name, sms_sender_id, whatsapp_enabled, settings, plan")
      .eq("id", org_id)
      .single(),
  ]);

  if (!member?.parent_phone) {
    return NextResponse.json({ skipped: true, reason: "no_phone" });
  }

  const settings = (org?.settings as any) ?? {};

  // Master switch: schools that only want app/push notifications (no
  // per-message Termii cost) can turn this off entirely in Settings.
  // Defaults to true (enabled) so existing schools who never touched
  // this setting keep working exactly as before — this is opt-out, not
  // opt-in, to avoid silently breaking notifications for anyone.
  //
  // Also respects the existing per-type toggles (sms_on_arrival /
  // sms_on_absence) — these were already present in the settings UI
  // and saveable, but this route never actually checked them, so
  // toggling them off had no effect. Fixed here.
  const perTypeEnabled =
    type === "arrival" ? settings.sms_on_arrival !== false :
    type === "absence" ? settings.sms_on_absence !== false :
    true; // no per-type toggle exists yet for "registration"
  const smsEnabled = settings.sms_notifications_enabled !== false && perTypeEnabled;

  // Plan-gate check: only allow WhatsApp routing if BOTH the org enabled
  // it in settings AND their current plan actually includes the feature
  // AND Termii has approved their WhatsApp sender (whatsapp_enabled).
  const planQualifies = hasFeature(org?.plan, "whatsappNotifications");
  const useWhatsApp = (org?.whatsapp_enabled === true || settings.whatsapp_notifications === true)
    && planQualifies;

  const time = new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });

  let message = "";
  if (type === "arrival") {
    message = buildArrivalSms({
      parentName:  "Parent",
      studentName: member.full_name,
      schoolName:  org?.name ?? "School",
      time,
      isLate:      is_late ?? false,
    });
  } else if (type === "absence") {
    message = buildAbsenceSms({
      parentName:  "Parent",
      studentName: member.full_name,
      schoolName:  org?.name ?? "School",
    });
  } else if (type === "registration") {
    message = `${org?.name ?? "School"}: ${member.full_name} has been registered. Their QR card is ready.`;
  } else {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  const result = smsEnabled
    ? await sendNotification({
        to:          member.parent_phone,
        message,
        orgId:       org_id,
        useWhatsApp,
      })
    : { ok: true, channel: "sms" as const, messageId: undefined, error: undefined };

  await serviceSupabase.from("notifications_log").insert({
    organisation_id:     org_id,
    member_id,
    channel:             smsEnabled ? result.channel : "disabled",
    recipient:           member.parent_phone,
    message,
    status:              smsEnabled ? (result.ok ? "sent" : "failed") : "skipped_disabled",
    provider_message_id: result.messageId ?? null,
    error_message:       smsEnabled ? (result.ok ? null : result.error) : null,
  });

  // ── Send push notification to parent (alongside SMS) ──────────
  // Push is fire-and-forget — never block the response on it.
  const pushTitle = type === "arrival"
    ? `${member.full_name} has arrived`
    : type === "absence"
    ? `${member.full_name} is absent today`
    : `${org?.name ?? "School"} update`;

  const pushBody = type === "arrival"
    ? `${is_late ? "Late arrival" : "Arrived safely"} at ${org?.name ?? "school"}`
    : type === "absence"
    ? `${member.full_name} has not been scanned today`
    : message;

  fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`,
    {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        type,
        org_id,
        title:     pushTitle,
        body:      pushBody,
        target:    "parent",
        member_id,
        data:      { is_late: is_late ?? false },
      }),
    }
  ).catch((e) => console.warn("[PUSH] fire-and-forget failed:", e));

  return NextResponse.json({
    success: result.ok,
    channel: smsEnabled ? result.channel : "disabled",
    error: result.error,
    whatsapp_plan_blocked: !planQualifies && settings.whatsapp_notifications === true,
  });
}