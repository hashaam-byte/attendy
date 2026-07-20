// src/app/api/org-classes/route.ts — ATTENDY-EDU
// GET  — list all classes for the current org
// POST — add a new class
// PATCH — reorder / rename / toggle active

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users").select("organisation_id").eq("user_id", user.id).eq("is_active", true).single();
  if (!orgUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("org_classes")
    .select("id, name, sort_order, is_active")
    .eq("organisation_id", orgUser.organisation_id)
    .order("sort_order")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ classes: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users").select("organisation_id, role").eq("user_id", user.id).eq("is_active", true).single();
  if (!orgUser || orgUser.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Class name required" }, { status: 400 });

  // Get next sort_order
  const { count } = await supabase
    .from("org_classes")
    .select("*", { count: "exact", head: true })
    .eq("organisation_id", orgUser.organisation_id);

  const { data, error } = await supabase
    .from("org_classes")
    .insert({ organisation_id: orgUser.organisation_id, name: name.trim(), sort_order: count ?? 0 })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A class with that name already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ class: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users").select("organisation_id, role").eq("user_id", user.id).eq("is_active", true).single();
  if (!orgUser || orgUser.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id, name, sort_order, is_active } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (name     !== undefined) updates.name       = name.trim();
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (is_active  !== undefined) updates.is_active  = is_active;

  const { error } = await supabase
    .from("org_classes")
    .update(updates)
    .eq("id", id)
    .eq("organisation_id", orgUser.organisation_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users").select("organisation_id, role").eq("user_id", user.id).eq("is_active", true).single();
  if (!orgUser || orgUser.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Check if any active students are in this class before deleting
  const { count: studentCount } = await supabase
    .from("members")
    .select("*", { count: "exact", head: true })
    .eq("organisation_id", orgUser.organisation_id)
    .eq("class_name", id) // we'll check by name below
    .eq("is_active", true);

  // Get class name first
  const { data: cls } = await supabase
    .from("org_classes").select("name").eq("id", id).single();

  if (cls) {
    const { count: sc } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgUser.organisation_id)
      .eq("class_name", cls.name)
      .eq("is_active", true);

    if ((sc ?? 0) > 0) {
      return NextResponse.json({
        error: `Cannot delete — ${sc} active student${sc !== 1 ? "s" : ""} are in ${cls.name}. Move them first.`
      }, { status: 409 });
    }
  }

  const { error } = await supabase
    .from("org_classes").delete().eq("id", id).eq("organisation_id", orgUser.organisation_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}