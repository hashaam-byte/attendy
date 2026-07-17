import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./setiings-client";
import Link from "next/link";
import { KeyRound, ChevronRight, Settings2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase  = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/login`);

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) redirect(`/${slug}/login`);

  // Non-admins — minimal settings (change password only)
  if (orgUser.role !== "admin") {
    return (
      <div className="max-w-md space-y-6">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-sub capitalize">{orgUser.role} account</p>
        </div>

        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
            <Settings2 size={15} style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Account</h3>
          </div>
          <Link
            href={`/${slug}/settings/change-password`}
            className="flex items-center justify-between p-3 rounded-xl border transition-all group hover:bg-(--accent-bg) hover:border-(--border-strong)"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--accent-bg)" }}>
                <KeyRound size={14} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Change Password</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Update your login password</p>
              </div>
            </div>
            <ChevronRight size={14} style={{ color: "var(--icon-default)" }} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          To change school settings, ask your school admin.
        </p>
      </div>
    );
  }

  // Admin — full settings
  const orgId = orgUser.organisation_id;

  const [
    { data: org },
    { data: staffRows },
    { data: classRows },
    { data: assignmentRows },
  ] = await Promise.all([
    supabase.from("organisations").select("*").eq("id", orgId).single(),

    supabase.from("org_users")
      .select("id, user_id, role, is_active, created_at, email")
      .eq("organisation_id", orgId)
      .order("created_at"),

    // Distinct class names from active students
    supabase.from("members")
      .select("class_name")
      .eq("organisation_id", orgId)
      .eq("member_type", "student")
      .eq("is_active", true),

    // All current teacher→class assignments for this org
    supabase.from("class_assignments")
      .select("org_user_id, class_name")
      .eq("organisation_id", orgId),
  ]);

  // Build unique sorted class list
  const uniqueClasses = [...new Set(
    (classRows ?? []).map((r) => r.class_name).filter(Boolean) as string[]
  )].sort();

  // Build per-teacher assignment map
  const assignmentMap = new Map<string, string[]>();
  (assignmentRows ?? []).forEach((a) => {
    const list = assignmentMap.get(a.org_user_id) ?? [];
    list.push(a.class_name);
    assignmentMap.set(a.org_user_id, list);
  });

  // Read emails directly from org_users.email column — much faster than
  // calling auth.admin.listUsers() which fetches ALL users in the project
  // and requires the service role. The email column is always populated
  // by create-school-user (both edu and admin paths).
  const enrichedStaff = (staffRows ?? []).map((s) => ({
    ...s,
    email:       s.email ?? null,
    assignments: assignmentMap.get(s.id) ?? [],
  }));

  return (
    <SettingsClient
      org={org}
      staff={enrichedStaff}
      classes={uniqueClasses}
      currentUserId={user.id}
      slug={slug}
    />
  );
}