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

  // Plan-gate check: only allow WhatsApp routing if BOTH the org enabled
  // it in settings AND their current plan actually includes the feature
  // AND Termii has approved their WhatsApp sender (whatsapp_enabled).
  const planQualifies = hasFeature(org?.plan, "whatsappNotifications");
  const useWhatsApp = org?.whatsapp_enabled === true
    && settings.whatsapp_notifications === true
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

  const result = await sendNotification({
    to:          member.parent_phone,
    message,
    orgId:       org_id,
    useWhatsApp,
  });

  await serviceSupabase.from("notifications_log").insert({
    organisation_id:     org_id,
    member_id,
    channel:             result.channel,
    recipient:           member.parent_phone,
    message,
    status:              result.ok ? "sent" : "failed",
    provider_message_id: result.messageId ?? null,
    error_message:       result.ok ? null : result.error,
  });

  return NextResponse.json({
    success: result.ok,
    channel: result.channel,
    error: result.error,
    whatsapp_plan_blocked: !planQualifies && settings.whatsapp_notifications === true,
  });
}
