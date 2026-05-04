// src/app/api/invite-staff/route.ts  (ATTENDY-EDU)
// FIXES:
// 1. Checks that SUPABASE_SERVICE_ROLE_KEY is actually set before using it
// 2. Validates NEXT_PUBLIC_APP_URL is set, with a clear error if not
// 3. Adds proper error logging so you can see what's failing in Vercel logs
// 4. Handles the case where the user already exists in Supabase Auth
// 5. Returns a more descriptive error when the invite fails

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // 1. Auth check — only admins can invite staff
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || orgUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // 2. Validate required environment variables
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables");
    return NextResponse.json(
      { error: "Server configuration error: service key missing. Contact Attendy support." },
      { status: 500 }
    );
  }

  if (!appUrl) {
    console.error("NEXT_PUBLIC_APP_URL is not set in environment variables");
    return NextResponse.json(
      { error: "Server configuration error: app URL missing. Contact Attendy support." },
      { status: 500 }
    );
  }

  // 3. Parse body
  const { email, role, org_id } = await req.json();

  if (!email || !role || !org_id) {
    return NextResponse.json({ error: "Missing email, role, or org_id" }, { status: 400 });
  }

  // Security: ensure the org_id matches the admin's own org
  if (org_id !== orgUser.organisation_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate role
  const validRoles = ["admin", "teacher", "gateman"];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
      { status: 400 }
    );
  }

  // 4. Create service-role admin client
  const serviceSupabase = createAdminClient(supabaseUrl!, serviceRoleKey);

  // 5. Send invite email
  const redirectTo = `${appUrl}/accept-invite`;
  console.log(`Inviting ${email} as ${role} to org ${org_id}, redirectTo: ${redirectTo}`);

  const { data: inviteData, error: inviteError } = await serviceSupabase.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      redirectTo,
      data: {
        org_id,
        role,
        // These appear in the user's raw_user_meta_data after they accept
        invited_as: role,
        invited_to_org: org_id,
      },
    }
  );

  if (inviteError) {
    console.error("Invite error:", inviteError.message, inviteError);

    // Common error: user already exists
    if (
      inviteError.message.toLowerCase().includes("already been registered") ||
      inviteError.message.toLowerCase().includes("already exists")
    ) {
      return NextResponse.json(
        {
          error:
            "A user with this email already exists. Use the admin panel to add them to this school directly, or ask them to use their existing login.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: `Failed to send invite: ${inviteError.message}` },
      { status: 500 }
    );
  }

  if (!inviteData?.user) {
    console.error("Invite returned no user data");
    return NextResponse.json(
      { error: "Invite sent but no user data returned. Check your Supabase email settings." },
      { status: 500 }
    );
  }

  // 6. Pre-create the org_users row so it's ready when they accept
  // (The accept-invite page also does this, but doing it here ensures
  //  the record exists even if the user accepts from a different device)
  const { error: orgUserError } = await serviceSupabase.from("org_users").upsert(
    {
      user_id: inviteData.user.id,
      organisation_id: org_id,
      role,
      is_active: true,
    },
    { onConflict: "user_id,organisation_id" }
  );

  if (orgUserError) {
    console.error("org_users insert error after invite:", orgUserError.message);
    // Non-fatal — the invite email was still sent. Log and continue.
    // The accept-invite page will also attempt this upsert.
  }

  console.log(`Invite sent successfully to ${email} (user id: ${inviteData.user.id})`);

  return NextResponse.json({
    success: true,
    message: `Invite email sent to ${email}. They will receive a link to set their password.`,
    user_id: inviteData.user.id,
  });
}