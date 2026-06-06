
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NoticesClient } from "./notices-client";

export const dynamic = "force-dynamic";

export default async function NoticesPage({
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

  const orgId = orgUser.organisation_id;

  // Fetch active notices (not expired)
  const { data: notices } = await supabase
    .from("school_notices")
    .select("id, title, body, priority, target_classes, expires_at, created_at, created_by")
    .eq("organisation_id", orgId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false });

  // Fetch classes for targeting
  const { data: classRows } = await supabase
    .from("members")
    .select("class_name")
    .eq("organisation_id", orgId)
    .eq("member_type", "student")
    .eq("is_active", true);

  const uniqueClasses = [...new Set(
    (classRows ?? []).map((r) => r.class_name).filter(Boolean) as string[]
  )].sort();

  return (
    <NoticesClient
      notices={notices ?? []}
      classes={uniqueClasses}
      role={orgUser.role}
      orgId={orgId}
      slug={slug}
    />
  );
}