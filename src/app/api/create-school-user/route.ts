// src/app/api/create-school-user/route.ts — ATTENDY-EDU
// Called by org admins from Settings → Add Staff Member.
// Auth: org admin only (NOT platform admin — this is the school-side version).
// Flow:
//   1. Verify caller is an active admin of the org
//   2. Check plan member/staff limits
//   3. Create Supabase auth user (email_confirm: true — no email sent)
//   4. Create org_users row linking user → org with given role
//   5. Optionally send login credentials via SMS if phone provided
//   6. Return credentials so admin can copy/share manually

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendSms } from "@/lib/sms";

// Service-role client — needed to call auth.admin.createUser
const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Role validation ────────────────────────────────────────────
const VALID_ROLES = ["admin", "teacher", "gateman"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

// ── Plan staff limits ──────────────────────────────────────────
// Separate from member (student) limits. Schools rarely have more than
// a handful of staff logins, so these are generous but enforced.
const PLAN_STAFF_LIMITS: Record<string, number> = {
  trial:      3,
  basic:      5,
  standard:   15,
  premium:    50,
  enterprise: 999,
};

// ── Helper: normalise Nigerian phone number ────────────────────
function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  return digits;
}

// ── POST /api/create-school-user ───────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Authenticate caller as an org admin
  const supabase = await createServerClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Confirm caller is an active admin of an education org
  const { data: callerOrgUser, error: orgUserErr } = await supabase
    .from("org_users")
    .select("role, organisation_id, organisations(id, name, slug, plan, is_active, industry)")
    .eq("user_id", caller.id)
    .eq("role", "admin")
    .eq("is_active", true)
    .single();

  if (orgUserErr || !callerOrgUser) {
    return NextResponse.json(
      { error: "Only school admins can create staff accounts." },
      { status: 403 }
    );
  }

  const org = (() => {
    const orgData = callerOrgUser.organisations;
    return Array.isArray(orgData) ? orgData[0] : orgData;
  })() as {
    id: string;
    name: string;
    slug: string;
    plan: string;
    is_active: boolean;
    industry: string;
  } | null;

  if (!org || org.industry !== "education") {
    return NextResponse.json(
      { error: "This endpoint is for education organisations only." },
      { status: 403 }
    );
  }

  if (!org.is_active) {
    return NextResponse.json(
      { error: "Your school account is suspended. Contact Attendy support." },
      { status: 403 }
    );
  }

  const orgId = callerOrgUser.organisation_id;

  // 3. Parse & validate request body
  const body = await req.json();
  const {
    email,
    password,
    role,
    phone,        // optional — staff phone for SMS credential delivery
  }: {
    email:    string;
    password: string;
    role:     string;
    phone?:   string;
  } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email address is required." }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (!role || !VALID_ROLES.includes(role as ValidRole)) {
    return NextResponse.json(
      { error: `Role must be one of: ${VALID_ROLES.join(", ")}.` },
      { status: 400 }
    );
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone ? normalisePhone(phone) : null;

  // 4. Enforce plan staff limits
  const staffLimit = PLAN_STAFF_LIMITS[org.plan] ?? 3;
  const { count: currentStaffCount, error: countErr } = await adminSupabase
    .from("org_users")
    .select("*", { count: "exact", head: true })
    .eq("organisation_id", orgId)
    .eq("is_active", true);

  if (countErr) {
    console.error("[create-school-user] count error:", countErr.message);
    return NextResponse.json({ error: "Failed to check staff limit." }, { status: 500 });
  }

  if ((currentStaffCount ?? 0) >= staffLimit) {
    return NextResponse.json(
      {
        error: `Your ${org.plan} plan allows a maximum of ${staffLimit} staff accounts. ` +
          `Please upgrade your plan to add more.`,
        code: "STAFF_LIMIT_REACHED",
        limit: staffLimit,
        current: currentStaffCount,
      },
      { status: 422 }
    );
  }

  // 5. Check if email is already registered in Supabase auth
  //    We do this via admin.listUsers with a filter — cheaper than a failed createUser call.
  //    Note: listUsers doesn't support filtering by email directly, so we attempt create
  //    and handle the conflict error gracefully.

  // 6. Create the Supabase auth user
  const { data: newUserData, error: createError } =
    await adminSupabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true, // skip confirmation email — admin is handing creds directly
      user_metadata: {
        org_id:   orgId,
        org_name: org.name,
        org_slug: org.slug,
        role,
      },
    });

  if (createError) {
    // Email already exists
    if (
      createError.message.toLowerCase().includes("already been registered") ||
      createError.message.toLowerCase().includes("already exists") ||
      createError.message.toLowerCase().includes("email address has already")
    ) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. " +
            "If they need access to this school, ask them to log in and contact support.",
          code: "EMAIL_TAKEN",
        },
        { status: 409 }
      );
    }

    console.error("[create-school-user] auth.admin.createUser error:", createError.message);
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  if (!newUserData.user) {
    return NextResponse.json({ error: "Failed to create user account." }, { status: 500 });
  }

  const newUser = newUserData.user;

  // 7. Create org_users row — links auth user → this school with the given role.
  // We also store email directly in org_users so it's always queryable without
  // needing auth.admin.listUsers() (which requires service role + is slow).
  const { error: orgUserInsertError } = await adminSupabase
    .from("org_users")
    .upsert(
      {
        user_id:         newUser.id,
        organisation_id: orgId,
        role,
        is_active:       true,
        email:           newUser.email ?? email.trim().toLowerCase(),
      },
      { onConflict: "user_id,organisation_id" }
    );

  if (orgUserInsertError) {
    // Rollback — remove the auth user we just created so we don't leave orphans
    await adminSupabase.auth.admin.deleteUser(newUser.id);
    console.error("[create-school-user] org_users insert error:", orgUserInsertError.message);
    return NextResponse.json({ error: orgUserInsertError.message }, { status: 500 });
  }

  // 8. Optionally send login credentials via SMS
  let smsSent = false;
  let smsError: string | null = null;

  if (cleanPhone && cleanPhone.length >= 10) {
    const loginUrl = `https://attendy-edu.vercel.app/${org.slug}/login`;
    const smsMessage =
      `Your Attendy login for ${org.name}:\n` +
      `URL: ${loginUrl}\n` +
      `Email: ${cleanEmail}\n` +
      `Password: ${password}\n` +
      `Role: ${role}. Change your password after first login.`;

    try {
      const smsResult = await sendSms(cleanPhone, smsMessage);
      smsSent = smsResult.ok;
      if (!smsResult.ok) smsError = smsResult.error ?? "SMS delivery failed";

      // Log the notification regardless of success/failure
      await adminSupabase.from("notifications_log").insert({
        organisation_id:     orgId,
        member_id:           null, // staff user, not a student member
        channel:             "sms",
        recipient:           cleanPhone,
        message:             smsMessage,
        status:              smsResult.ok ? "sent" : "failed",
        provider_message_id: smsResult.messageId ?? null,
        error_message:       smsResult.ok ? null : (smsResult.error ?? "Unknown error"),
      });
    } catch (e: any) {
      smsError = e.message ?? "Unexpected SMS error";
      console.error("[create-school-user] SMS error:", smsError);
    }
  }

  // 9. Log to audit_logs
  try {
    await adminSupabase.from("audit_logs").insert({
      organisation_id: orgId,
      action:          "user_created",
      details: {
        email:    cleanEmail,
        role,
        sms_sent: smsSent,
        created_by: caller.email ?? caller.id,
      },
      performed_by: caller.id,
    });
  } catch (e) {
    // Non-fatal — never block the response for a logging failure
    console.error("[create-school-user] audit log error:", e);
  }

  // 10. Return success with everything the admin needs to share credentials
  return NextResponse.json({
    success: true,
    sms_sent: smsSent,
    sms_error: smsError,
    user: {
      id:    newUser.id,
      email: newUser.email,
      role,
      organisation_id: orgId,
    },
    // Return the login URL so the modal can display it
    login_url: `https://attendy-edu.vercel.app/${org.slug}/login`,
  });
}