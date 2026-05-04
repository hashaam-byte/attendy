import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Users, Upload } from "lucide-react";
import { StudentsClient } from "./students-client";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) redirect("/login");
  const orgId = orgUser.organisation_id;

  const [{ data: students }, { data: org }] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, class_name, parent_phone, qr_code, employee_id, is_active, photo_url, created_at")
      .eq("organisation_id", orgId)
      .eq("member_type", "student")
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

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Students</h2>
          <p className="page-sub">
            {activeCount} active · {maxMembers} max ({org?.plan ?? "trial"} plan)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {orgUser.role === "admin" && (
            <>
              <Link href="/students/register" className="btn-primary">
                <Plus size={15} />
                Add Student
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Near limit warning */}
      {nearLimit && (
        <div className="card p-4 border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/20">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            ⚠️ You are at <strong>{activeCount}/{maxMembers}</strong> students ({Math.round((activeCount / maxMembers) * 100)}% capacity). Contact Attendy to upgrade your plan.
          </p>
        </div>
      )}

      <StudentsClient
        students={students ?? []}
        orgId={orgId}
        role={orgUser.role}
        maxMembers={maxMembers}
        activeCount={activeCount}
      />
    </div>
  );
}