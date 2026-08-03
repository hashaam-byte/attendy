import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getParentSessionFromRequest } from "@/lib/parent-session";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const session = getParentSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session expired. Please log in again." }, { status: 401 });
  }

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId || !session.studentIds.includes(studentId)) {
    return NextResponse.json({ ok: false, error: "Not authorized for this student" }, { status: 403 });
  }

  const { data: student } = await adminSupabase
    .from("members")
    .select("id, organisation_id")
    .eq("id", studentId)
    .single();

  if (!student) {
    return NextResponse.json({ ok: false, error: "Student not found" }, { status: 404 });
  }

  const [{ data: logs }, { data: org }] = await Promise.all([
    adminSupabase
      .from("attendance_logs")
      .select("id, scanned_at, status, scan_type, late_reason")
      .eq("member_id", studentId)
      .eq("scan_type", "entry")
      .order("scanned_at", { ascending: false })
      .limit(400),
    adminSupabase
      .from("organisations")
      .select("id, name, primary_color, logo_url, settings")
      .eq("id", student.organisation_id)
      .single(),
  ]);

  return NextResponse.json({ ok: true, logs: logs ?? [], org: org ?? null });
}