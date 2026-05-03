import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendSms, buildArrivalSms } from "@/lib/sms";

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

  // Get member + org
  const [{ data: member }, { data: org }] = await Promise.all([
    serviceSupabase
      .from("members")
      .select("full_name, parent_phone, class_name")
      .eq("id", member_id)
      .single(),

    serviceSupabase
      .from("organisations")
      .select("name, sms_sender_id")
      .eq("id", org_id)
      .single(),
  ]);

  if (!member?.parent_phone) {
    return NextResponse.json({ skipped: true, reason: "no_phone" });
  }

  const time = new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });

  let message = "";
  if (type === "arrival") {
    message = buildArrivalSms({
      parentName: "Parent",
      studentName: member.full_name,
      schoolName: org?.name ?? "School",
      time,
      isLate: is_late ?? false,
    });
  } else if (type === "registration") {
    message = `Attendy: ${member.full_name} has been registered at ${org?.name ?? "School"}. Their QR card is ready.`;
  } else {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  const result = await sendSms(member.parent_phone, message);

  // Log notification
  await serviceSupabase.from("notifications_log").insert({
    organisation_id: org_id,
    member_id,
    channel: "sms",
    recipient: member.parent_phone,
    message,
    status: result.ok ? "sent" : "failed",
    provider_message_id: result.messageId ?? null,
    error_message: result.ok ? null : result.error,
  });

  return NextResponse.json({ success: result.ok, error: result.error });
}