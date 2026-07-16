// src/app/[slug]/api/clear-notifications/route.ts — ATTENDY-EDU
// Deletes all notifications_log rows for the org using the service role key.
// The anon/user Supabase client can't delete from notifications_log because
// the RLS delete policy only allows platform admins — this bypasses that
// correctly using the service role which is safe since we verify admin role first.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Verify the caller is an authenticated admin for this org
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || orgUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Delete using service role — bypasses the RLS policy that blocks user deletes
  const { error, count } = await adminSupabase
    .from("notifications_log")
    .delete({ count: "exact" })
    .eq("organisation_id", orgUser.organisation_id);

  if (error) {
    console.error("[clear-notifications] delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0 });
}