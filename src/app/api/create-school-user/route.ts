
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Only platform admins can create users
  const adminSupabase = await createClient();
  const { data: { user } } = await adminSupabase.auth.getUser();
  if (!user || user.app_metadata?.platform_admin !== true) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, password, role, organisation_id, org_name } = await req.json();

  if (!email || !password || !role || !organisation_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Check org exists
  const { data: org } = await adminSupabase
    .from("organisations")
    .select("id, name, industry, is_active")
    .eq("id", organisation_id)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }

  // Create auth user — email_confirm: true so no email is sent
  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: {
      org_id: organisation_id,
      org_name: org.name,
      role,
    },
  });

  if (createError) {
    if (createError.message.includes("already been registered") || createError.message.includes("already exists")) {
      return NextResponse.json(
        { error: "A user with this email already exists. Use a different email." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  if (!newUser.user) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  // Create org_users row linking this user to the org with the given role
  const { error: orgUserError } = await adminSupabase
    .from("org_users")
    .upsert(
      { user_id: newUser.user.id, organisation_id, role, is_active: true },
      { onConflict: "user_id,organisation_id" }
    );

  if (orgUserError) {
    // Rollback — delete the auth user we just created
    await adminSupabase.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ error: orgUserError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    user: { id: newUser.user.id, email: newUser.user.email, role, organisation_id },
  });
}