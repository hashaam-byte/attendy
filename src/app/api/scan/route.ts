import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// This endpoint is called by the scanner page (anon) to log a scan
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { qr_code, organisation_id, device_id } = body;

  if (!qr_code || !organisation_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Find member
  const { data: member } = await serviceSupabase
    .from("members")
    .select("id, full_name, class_name, parent_phone, is_active, organisation_id")
    .eq("qr_code", qr_code)
    .eq("organisation_id", organisation_id)
    .single();

  if (!member) return NextResponse.json({ error: "Unknown QR code" }, { status: 404 });
  if (!member.is_active) return NextResponse.json({ error: "Student is inactive" }, { status: 403 });

  const today = new Date().toISOString().split("T")[0];

  // Check duplicate
  const { data: existing } = await serviceSupabase
    .from("attendance_logs")
    .select("id, scanned_at")
    .eq("member_id", member.id)
    .eq("organisation_id", organisation_id)
    .eq("scan_type", "entry")
    .gte("scanned_at", `${today}T00:00:00`)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({
      duplicate: true,
      name: member.full_name,
      class_name: member.class_name,
      scanned_at: existing[0].scanned_at,
    });
  }

  // Determine late status (simple: after 8AM)
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(8, 0, 0, 0);
  const isLate = now > cutoff;

  const { error } = await serviceSupabase.from("attendance_logs").insert({
    organisation_id,
    member_id: member.id,
    scan_type: "entry",
    status: isLate ? "late" : "present",
    device_id: device_id ?? null,
    scanned_at: now.toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    is_late: isLate,
    name: member.full_name,
    class_name: member.class_name,
    parent_phone: member.parent_phone,
  });
}