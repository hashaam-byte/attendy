
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { StudentsClient } from "./students-client";
import { hasFeature } from "@/lib/plan-features";

export const dynamic = "force-dynamic";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/login`);

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) redirect(`/${slug}/login`);
  const orgId = orgUser.organisation_id;

  const [{ data: students }, { data: org }] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, class_name, parent_phone, qr_code, employee_id, is_active, photo_url, created_at")
      .eq("organisation_id", orgId)
      .eq("member_type", "student")
      .order("class_name")
      .order("full_name"),

    supabase
      .from("organisations")
      .select("name, plan, max_members")
      .eq("id", orgId)
      .single(),
  ]);

  const activeCount = (students ?? []).filter((s) => s.is_active).length;
  const maxMembers = org?.max_members ?? 30;
  const nearLimit = activeCount >= Math.floor(maxMembers * 0.9);
  const canExport = hasFeature(org?.plan, "studentExport");

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Students</h2>
          <p className="page-sub">
            {activeCount} active · {maxMembers} max ({org?.plan ?? "trial"} plan)
          </p>
        </div>
        {orgUser.role === "admin" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/${slug}/students/import`} className="btn-secondary self-start text-sm">
              <Upload size={14} />
              Import
            </Link>
            <Link href={`/${slug}/students/register`} className="btn-primary self-start">
              <Plus size={15} />
              Add Student
            </Link>
          </div>
        )}
      </div>

      {nearLimit && (
        <div className="card p-4" style={{ borderColor: "var(--status-warning)", background: "var(--status-warning-bg)" }}>
          <p className="text-sm" style={{ color: "var(--status-warning)" }}>
            ⚠️ You are at <strong>{activeCount}/{maxMembers}</strong> students (
            {Math.round((activeCount / maxMembers) * 100)}% capacity). Contact Attendy to upgrade.
          </p>
        </div>
      )}

      <StudentsClient
        students={students ?? []}
        orgId={orgId}
        role={orgUser.role}
        maxMembers={maxMembers}
        activeCount={activeCount}
        slug={slug}
        canExport={canExport}
      />
    </div>
  );
}
