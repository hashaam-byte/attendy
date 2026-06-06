// src/app/[slug]/(dashboard)/settings/page.tsx — ATTENDY-EDU v4
// ROLE-BASED SETTINGS:
//   admin   → full settings (existing SettingsClient)
//   teacher/gateman → limited view (Change Password only)

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./setiings-client";
import Link from "next/link";
import { KeyRound, ChevronRight } from "lucide-react";

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

  // Non-admins see a minimal page with only Change Password
  if (orgUser.role !== "admin") {
    return (
      <div className="max-w-md space-y-6">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-sub capitalize">{orgUser.role} account</p>
        </div>

        <div className="card p-5 space-y-4">
          <Link
            href={`/${slug}/settings/change-password`}
            className="flex items-center justify-between p-3 rounded-xl border border-[#bbf7d0] dark:border-[#1a3a24] hover:bg-green-50 dark:hover:bg-green-950/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <KeyRound size={14} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Change Password</p>
                <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">Update your login password</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-slate-300 dark:text-[#2d5a3d] shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">
          To change school settings, ask your school admin.
        </p>
      </div>
    );
  }

  // Admin — full settings
  const { data: org } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", orgUser.organisation_id)
    .single();

  const { data: staffRows } = await supabase
    .from("org_users")
    .select("id, user_id, role, is_active, created_at")
    .eq("organisation_id", orgUser.organisation_id)
    .order("created_at");

  const enrichedStaff = (staffRows ?? []).map((s) => ({ ...s, email: null }));

  return (
    <SettingsClient
      org={org}
      staff={enrichedStaff}
      currentUserId={user.id}
      slug={slug}
    />
  );
}