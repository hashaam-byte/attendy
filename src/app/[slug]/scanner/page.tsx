import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScannerClient } from "./scanner-client";

export const dynamic = "force-dynamic";

export default async function ScannerPage({ params }: { params: { slug: string } }) {
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

  // Get org settings
  const { data: org } = await supabase
    .from("organisations")
    .select("name, is_active, plan, plan_expires_at, primary_color, settings")
    .eq("id", orgUser.organisation_id)
    .single();

  if (!org?.is_active) redirect("/login?error=suspended");

  return (
    <ScannerClient
      orgId={orgUser.organisation_id}
      orgName={org.name}
      role={orgUser.role}
      userId={user.id}
      orgSlug={params.slug}
      primaryColor={org.primary_color}
      settings={org.settings}
    />
  );
}