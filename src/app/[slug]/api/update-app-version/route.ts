// src/app/[slug]/api/update-app-version/route.ts — ATTENDY-EDU
// Admin-only: push an app version update to platform_settings.
// Mobile SettingsScreen reads this and shows a banner to users.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Next.js 16: do NOT declare slug in params type for nested [slug] routes
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || orgUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { latest, force } = await req.json();
  if (!latest || typeof latest !== "string") {
    return NextResponse.json({ error: "Missing version" }, { status: 400 });
  }

  const { error } = await adminSupabase
    .from("platform_settings")
    .upsert(
      { key: "app_version", value: { latest, force: force ?? false } },
      { onConflict: "key" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}