import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createParentSessionToken, PARENT_SESSION_COOKIE, PARENT_SESSION_MAX_AGE_SECONDS } from "@/lib/parent-session";
import { normalisePhone, phoneVariants, nameMatches } from "@/lib/phone";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_ATTEMPTS_PER_WINDOW = 6;      // per phone number
const WINDOW_MS = 15 * 60 * 1000;       // 15 minutes
const LOCKOUT_AFTER_FAILURES = 4;       // failures within the window that trip the limit early

const GENERIC_ERROR = "Those details don't match our records. Check the spelling of your child's full name, or contact your school admin.";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const phone = normalisePhone(String(body?.phone ?? ""));
  const childName = String(body?.childName ?? "").trim();

  if (!phone) {
    return NextResponse.json({ ok: false, error: "Enter a valid Nigerian phone number" }, { status: 400 });
  }
  if (childName.split(/\s+/).filter(Boolean).length < 2) {
    return NextResponse.json({ ok: false, error: "Enter your child's full name (first and last name)" }, { status: 400 });
  }

  // ── Server-side rate limit ──────────────────────────────────────
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
  const { data: recentAttempts } = await adminSupabase
    .from("parent_login_attempts")
    .select("success, created_at")
    .eq("phone", phone)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false });

  const attempts = recentAttempts ?? [];
  const recentFailures = attempts.filter((a) => !a.success);

  if (attempts.length >= MAX_ATTEMPTS_PER_WINDOW || recentFailures.length >= LOCKOUT_AFTER_FAILURES) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please wait 15 minutes and try again, or contact your school admin." },
      { status: 429 }
    );
  }

  // ── Look up students for this phone (service role — bypasses RLS) ──
  const variants = phoneVariants(phone);
  const { data: students } = await adminSupabase
    .from("members")
    .select("id, full_name, class_name, organisation_id, parent_phone")
    .in("parent_phone", variants)
    .eq("member_type", "student")
    .eq("is_active", true);

  const match = (students ?? []).find((s) => nameMatches(childName, s.full_name));

  // Log the attempt (success or failure) for rate limiting, regardless of outcome.
  await adminSupabase.from("parent_login_attempts").insert({ phone, success: Boolean(match) });

  if (!match || !students || students.length === 0) {
    return NextResponse.json({ ok: false, error: GENERIC_ERROR }, { status: 401 });
  }

  // Match found — grant a session covering every active student
  // registered under this phone number (siblings), not just the one
  // whose name was typed.
  const token = createParentSessionToken(phone, students.map((s) => s.id));

  // Web (this browser) uses the httpOnly cookie automatically from here
  // on. Mobile has no browser cookie jar, so it also gets the raw token
  // back in the body — attendy-mobile stores it and sends it as
  // `Authorization: Bearer <token>` on subsequent requests.
  const res = NextResponse.json({ ok: true, students, token });
  res.cookies.set(PARENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PARENT_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}