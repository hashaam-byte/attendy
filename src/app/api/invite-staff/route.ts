
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users").select("role, organisation_id").eq("user_id", user.id).eq("is_active", true).single();
  if (!orgUser || orgUser.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!serviceRoleKey) { console.error("SUPABASE_SERVICE_ROLE_KEY not set"); return NextResponse.json({ error: "Server config error: service key missing." }, { status: 500 }); }
  if (!appUrl) { console.error("NEXT_PUBLIC_APP_URL not set"); return NextResponse.json({ error: "Server config error: app URL missing." }, { status: 500 }); }

  const { email, role, org_id } = await req.json();
  if (!email || !role || !org_id) return NextResponse.json({ error: "Missing email, role, or org_id" }, { status: 400 });
  if (org_id !== orgUser.organisation_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const validRoles = ["admin", "teacher", "gateman"];
  if (!validRoles.includes(role)) return NextResponse.json({ error: `Invalid role. Must be: ${validRoles.join(", ")}` }, { status: 400 });

  const serviceSupabase = createAdminClient(supabaseUrl!, serviceRoleKey);
  const trimmedEmail = email.trim().toLowerCase();

  // Check if user already exists in this org
  const { data: existingUsers } = await serviceSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUser = existingUsers?.users?.find(u => u.email === trimmedEmail);
  let userId: string;

  if (existingUser) {
    const { data: existingOrgUser } = await serviceSupabase
      .from("org_users").select("id").eq("user_id", existingUser.id).eq("organisation_id", org_id).single();
    if (existingOrgUser) return NextResponse.json({ error: "This email already has access to this school. Check the staff list in Settings." }, { status: 409 });
    userId = existingUser.id;
  } else {
    // Create user (they'll set password via invite link)
    const { data: newUser, error: createError } = await serviceSupabase.auth.admin.createUser({
      email: trimmedEmail,
      password: crypto.randomUUID() + "Aa1!",
      email_confirm: false,
      user_metadata: { org_id, role },
    });
    if (createError) { console.error("Create user error:", createError.message); return NextResponse.json({ error: `Failed to create user: ${createError.message}` }, { status: 500 }); }
    userId = newUser.user!.id;
  }

  // Pre-create org_users row
  await serviceSupabase.from("org_users").upsert(
    { user_id: userId, organisation_id: org_id, role, is_active: true },
    { onConflict: "user_id,organisation_id" }
  );

  // Generate PKCE invite link (?code= not #access_token=)
  const redirectTo = `${appUrl}/auth/callback?type=invite`;
  console.log(`Generating invite link for ${trimmedEmail}, redirectTo: ${redirectTo}`);

  const { error: linkError } = await serviceSupabase.auth.admin.generateLink({
    type: "invite",
    email: trimmedEmail,
    options: { redirectTo },
  });

  if (linkError) {
    console.error("generateLink error:", linkError.message);
    return NextResponse.json({ error: `Failed to generate invite link: ${linkError.message}` }, { status: 500 });
  }

  console.log(`Invite sent to ${trimmedEmail} (userId: ${userId})`);
  return NextResponse.json({ success: true, message: `Invite email sent to ${trimmedEmail}.`, user_id: userId });
}