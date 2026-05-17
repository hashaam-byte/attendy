// src/app/api/manage-staff/route.ts — ATTENDY-EDU v3
// Admin-only: suspend (deactivate) or delete a staff member.
// DELETE also removes the user from auth.users via service role.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function PATCH(req: NextRequest) {
  // Suspend / reactivate — just flips is_active on org_users
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || orgUser.role !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  const { org_user_id, is_active } = body;

  if (!org_user_id || typeof is_active !== "boolean")
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Make sure the target belongs to the same org
  const { data: target } = await supabase
    .from("org_users")
    .select("id, user_id, organisation_id")
    .eq("id", org_user_id)
    .eq("organisation_id", orgUser.organisation_id)
    .single();

  if (!target)
    return NextResponse.json({ error: "User not found in your organisation" }, { status: 404 });

  // Prevent self-suspension
  if (target.user_id === user.id)
    return NextResponse.json({ error: "You cannot suspend your own account" }, { status: 400 });

  const { error } = await supabase
    .from("org_users")
    .update({ is_active })
    .eq("id", org_user_id)
    .eq("organisation_id", orgUser.organisation_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  // Hard delete — removes from org_users AND auth.users
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || orgUser.role !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const org_user_id = searchParams.get("org_user_id");

  if (!org_user_id)
    return NextResponse.json({ error: "Missing org_user_id" }, { status: 400 });

  // Fetch the target's auth user_id & verify it's in the same org
  const { data: target } = await supabase
    .from("org_users")
    .select("id, user_id, organisation_id")
    .eq("id", org_user_id)
    .eq("organisation_id", orgUser.organisation_id)
    .single();

  if (!target)
    return NextResponse.json({ error: "User not found in your organisation" }, { status: 404 });

  // Prevent self-deletion
  if (target.user_id === user.id)
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl)
    return NextResponse.json({ error: "Server config error" }, { status: 500 });

  const admin = createAdminClient(supabaseUrl, serviceKey);

  // Delete from org_users first (FK cascade handles attendance_logs etc.)
  await supabase
    .from("org_users")
    .delete()
    .eq("id", org_user_id);

  // Delete from auth.users (this is irreversible)
  const { error: authError } = await admin.auth.admin.deleteUser(target.user_id);
  if (authError) {
    console.error("auth.admin.deleteUser error:", authError.message);
    // Non-fatal — org_users row is already gone, just log it
  }

  return NextResponse.json({ ok: true });
}