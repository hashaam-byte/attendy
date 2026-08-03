

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

  const memberId = String(body?.memberId ?? "");
  const expoPushToken = String(body?.expoPushToken ?? "").trim();

  if (!memberId || !session.studentIds.includes(memberId)) {
    return NextResponse.json({ ok: false, error: "Not authorized for this student" }, { status: 403 });
  }
  if (!expoPushToken.startsWith("ExponentPushToken")) {
    return NextResponse.json({ ok: false, error: "Invalid push token" }, { status: 400 });
  }

  const { data: student } = await adminSupabase
    .from("members")
    .select("id, organisation_id")
    .eq("id", memberId)
    .single();

  if (!student) {
    return NextResponse.json({ ok: false, error: "Student not found" }, { status: 404 });
  }

  const { error } = await adminSupabase.from("parent_push_tokens").upsert(
    {
      organisation_id: student.organisation_id,
      member_id: memberId,
      expo_push_token: expoPushToken,
      phone: session.phone,
      push_enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id,expo_push_token" }
  );

  if (error) {
    console.error("[REGISTER PUSH TOKEN] failed:", error.message);
    return NextResponse.json({ ok: false, error: "Failed to register" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}