// src/app/[slug]/gateman-scanner/page.tsx — ATTENDY-EDU (gateman clone)
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScannerClient } from "./scanner-client";

export const dynamic = "force-dynamic";

export default async function GatemanScannerPage({
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

  // Only gateman may access this route
  if (orgUser.role !== "gateman") redirect(`/${slug}`);

  const { data: org } = await supabase
    .from("organisations")
    .select("name, is_active, plan, plan_expires_at, primary_color, settings")
    .eq("id", orgUser.organisation_id)
    .single();

  if (!org?.is_active) redirect(`/suspended?slug=${slug}`);

  return (
    <ScannerClient
      orgId={orgUser.organisation_id}
      orgName={org.name}
      orgSlug={slug}
      role={orgUser.role}
      userId={user.id}
      primaryColor={org.primary_color || "#16a34a"}
      settings={(org.settings as any) || {}}
      isPublicScanner={false}
    />
  );
}
