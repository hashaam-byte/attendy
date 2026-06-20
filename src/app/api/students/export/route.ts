import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasFeature, minPlanFor } from "@/lib/plan-features";

function esc(v: string | null | undefined): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || orgUser.role !== "admin") {
    return new NextResponse("Admin only", { status: 403 });
  }

  const { data: org } = await supabase
    .from("organisations")
    .select("name, plan, slug")
    .eq("id", orgUser.organisation_id)
    .single();

  if (!org || !hasFeature(org.plan, "studentExport")) {
    return NextResponse.json(
      { error: `Student export requires the ${minPlanFor("studentExport")} plan or higher. Upgrade to export student records, e.g. when transferring students to another school.` },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const classFilter  = searchParams.get("class");
  const studentIds   = searchParams.get("ids"); // comma-separated, for selective export
  const includeInactive = searchParams.get("include_inactive") === "true";

  let query = supabase
    .from("members")
    .select("id, full_name, class_name, parent_phone, employee_id, notes, is_active, created_at")
    .eq("organisation_id", orgUser.organisation_id)
    .eq("member_type", "student")
    .order("class_name")
    .order("full_name");

  if (!includeInactive) query = query.eq("is_active", true);
  if (classFilter && classFilter !== "all") query = query.eq("class_name", classFilter);
  if (studentIds) query = query.in("id", studentIds.split(","));

  const { data: students, error } = await query;
  if (error) return new NextResponse(`Export failed: ${error.message}`, { status: 500 });

  const headers = ["full_name", "class_name", "parent_phone", "employee_id", "notes", "status", "registered_on"].map(esc).join(",");
  const rows = (students ?? []).map((s) => [
    esc(s.full_name),
    esc(s.class_name),
    esc(s.parent_phone),
    esc(s.employee_id),
    esc(s.notes),
    esc(s.is_active ? "active" : "inactive"),
    esc(s.created_at?.split("T")[0]),
  ].join(","));

  const csv = [headers, ...rows].join("\n");
  const filename = `${org.slug ?? "students"}_export_${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
