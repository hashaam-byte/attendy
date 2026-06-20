import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notify";
import { hasFeature } from "@/lib/plan-features";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || orgUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await req.json();

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: excuse } = await adminSupabase
    .from("excuse_requests")
    .select(`
      id, reason, start_date, end_date, status,
      member_id,
      members ( full_name, parent_phone, class_name )
    `)
    .eq("id", id)
    .eq("organisation_id", orgUser.organisation_id)
    .single();

  if (!excuse) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (excuse.status !== "pending") {
    return NextResponse.json({ error: "Already reviewed" }, { status: 409 });
  }

  if (action === "approve") {
    const { error: rpcErr } = await adminSupabase.rpc("approve_excuse_request", {
      excuse_id: id,
    });
    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    }

    const member = Array.isArray(excuse.members) ? excuse.members[0] : excuse.members;
    if (member?.parent_phone) {
      const { data: org } = await adminSupabase
        .from("organisations")
        .select("name, whatsapp_enabled, settings, plan")
        .eq("id", orgUser.organisation_id)
        .single();

      const isSameDay = excuse.start_date === excuse.end_date;
      const dateRange = isSameDay
        ? new Date(excuse.start_date).toLocaleDateString("en-NG", { day: "numeric", month: "long" })
        : `${new Date(excuse.start_date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })} – ${new Date(excuse.end_date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`;

      const message =
        `${org?.name ?? "School"}: The excuse request for ${member.full_name} ` +
        `(${dateRange}) has been approved. Attendance marked as excused.`;

      const settings = (org?.settings as any) ?? {};
      const useWhatsApp = org?.whatsapp_enabled === true
        && settings.whatsapp_notifications === true
        && hasFeature(org?.plan, "whatsappNotifications");

      const result = await sendNotification({
        to: member.parent_phone,
        message,
        orgId: orgUser.organisation_id,
        useWhatsApp,
      });

      await adminSupabase.from("notifications_log").insert({
        organisation_id: orgUser.organisation_id,
        member_id:       excuse.member_id,
        channel:         result.channel,
        recipient:       member.parent_phone,
        message,
        status:          result.ok ? "sent" : "failed",
        provider_message_id: result.messageId ?? null,
        error_message:   result.ok ? null : result.error,
      });
    }
  } else {
    await adminSupabase
      .from("excuse_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({ ok: true, action });
}
