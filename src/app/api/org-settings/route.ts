// src/app/api/org-settings/route.ts — ATTENDY-EDU v3
// Updates org settings (JSONB column) and/or logo_url
// Only org admins can call this

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get org user and verify admin
  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || orgUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const { settings, logo_url, primary_color, ...rest } = body;

  const update: Record<string, unknown> = {};

  // Merge settings JSONB (partial update)
  if (settings) {
    // Use Supabase's JSONB merge operator via RPC or just overwrite
    // We do a read-then-write to preserve existing keys
    const { data: currentOrg } = await supabase
      .from("organisations")
      .select("settings")
      .eq("id", orgUser.organisation_id)
      .single();

    const mergedSettings = {
      ...(currentOrg?.settings as Record<string, unknown> || {}),
      ...settings,
    };
    update.settings = mergedSettings;
  }

  if ("logo_url" in body) update.logo_url = logo_url;
  if (primary_color) update.primary_color = primary_color;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("organisations")
    .update(update)
    .eq("id", orgUser.organisation_id)
    .select()
    .single();

  if (error) {
    console.error("org-settings PATCH error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, org: data });
}