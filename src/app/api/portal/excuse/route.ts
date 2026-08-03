import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getParentSessionFromRequest } from "@/lib/parent-session";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const session = getParentSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session expired. Please log in again." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const studentId = String(body?.studentId ?? "");
  const startDate = String(body?.startDate ?? "");
  const endDate = String(body?.endDate ?? "");
  const reason = String(body?.reason ?? "").trim();

  if (!studentId || !session.studentIds.includes(studentId)) {
    return NextResponse.json({ ok: false, error: "Not authorized for this student" }, { status: 403 });
  }
  if (!startDate || !endDate || !reason) {
    return NextResponse.json({ ok: false, error: "Fill in the date range and a reason" }, { status: 400 });
  }
  if (reason.length > 500) {
    return NextResponse.json({ ok: false, error: "Reason is too long" }, { status: 400 });
  }

  const { data: student } = await adminSupabase
    .from("members")
    .select("id, full_name, organisation_id")
    .eq("id", studentId)
    .single();

  if (!student) {
    return NextResponse.json({ ok: false, error: "Student not found" }, { status: 404 });
  }

  const { error: insertError } = await adminSupabase.from("excuse_requests").insert({
    organisation_id: student.organisation_id,
    member_id: studentId,
    submitted_by: session.phone,
    start_date: startDate,
    end_date: endDate,
    reason,
    status: "pending",
  });

  if (insertError) {
    console.error("[PORTAL EXCUSE] insert failed:", insertError.message);
    return NextResponse.json({ ok: false, error: "Failed to submit. Please try again." }, { status: 500 });
  }

  // Notify admins — fire and forget, failure here shouldn't fail the request.
  fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      type: "excuse_request",
      org_id: student.organisation_id,
      title: "New Excuse Request",
      body: `${student.full_name}'s parent submitted an excuse request for review.`,
      target: "admins",
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}