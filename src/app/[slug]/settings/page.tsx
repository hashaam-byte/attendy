// src/app/[slug]/settings/page.tsx — ATTENDY-EDU v3
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./setiings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
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
  if (orgUser.role !== "admin") redirect(`/${slug}/dashboard`);

  const { data: org } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", orgUser.organisation_id)
    .single();

  // Get staff with email via auth admin — use service role
  const { data: staffRows } = await supabase
    .from("org_users")
    .select("id, user_id, role, is_active, created_at")
    .eq("organisation_id", orgUser.organisation_id)
    .order("created_at");

  // Enrich with emails
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