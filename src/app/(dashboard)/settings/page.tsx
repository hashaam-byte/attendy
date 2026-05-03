import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./setiings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
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
  if (orgUser.role !== "admin") redirect("/dashboard");

  const { data: org } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", orgUser.organisation_id)
    .single();

  // Get staff list
  const { data: staff } = await supabase
    .from("org_users")
    .select("id, user_id, role, is_active, created_at")
    .eq("organisation_id", orgUser.organisation_id)
    .order("created_at");

  return (
    <SettingsClient
      org={org}
      staff={staff ?? []}
      currentUserId={user.id}
    />
  );
}