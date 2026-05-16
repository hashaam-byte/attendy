// src/app/api/manage-student/route.ts — ATTENDY-EDU v3
// Admin/teacher: edit student info.
// Admin only: suspend (is_active=false) or hard-delete from members table.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── PATCH — edit info OR suspend/reactivate ───────────────────
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || !["admin", "teacher"].includes(orgUser.role))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const { student_id, full_name, class_name, parent_phone, employee_id, notes, is_active } = body;

  if (!student_id)
    return NextResponse.json({ error: "Missing student_id" }, { status: 400 });

  // Verify student belongs to same org
  const { data: student } = await supabase
    .from("members")
    .select("id, organisation_id")
    .eq("id", student_id)
    .eq("organisation_id", orgUser.organisation_id)
    .eq("member_type", "student")
    .single();

  if (!student)
    return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (full_name    !== undefined) update.full_name    = full_name.trim();
  if (class_name   !== undefined) update.class_name   = class_name || null;
  if (parent_phone !== undefined) update.parent_phone = parent_phone.trim() || null;
  if (employee_id  !== undefined) update.employee_id  = employee_id.trim() || null;
  if (notes        !== undefined) update.notes        = notes.trim() || null;

  // is_active (suspend / reactivate) — admin only
  if (is_active !== undefined) {
    if (orgUser.role !== "admin")
      return NextResponse.json({ error: "Only admins can change student status" }, { status: 403 });
    update.is_active = is_active;
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("members")
    .update(update)
    .eq("id", student_id)
    .eq("organisation_id", orgUser.organisation_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, student: data });
}

// ── DELETE — hard-delete student from members table ──────────
export async function DELETE(req: NextRequest) {
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
  const student_id = searchParams.get("student_id");

  if (!student_id)
    return NextResponse.json({ error: "Missing student_id" }, { status: 400 });

  // Verify student belongs to this org before deleting
  const { data: student } = await supabase
    .from("members")
    .select("id, organisation_id")
    .eq("id", student_id)
    .eq("organisation_id", orgUser.organisation_id)
    .eq("member_type", "student")
    .single();

  if (!student)
    return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", student_id)
    .eq("organisation_id", orgUser.organisation_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}