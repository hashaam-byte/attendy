// src/app/[slug]/(dashboard)/excuses/page.tsx — ATTENDY-EDU v4
// Admin view of all excuse requests — approve or reject

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExcusesClient } from "./excuses-client";

export const dynamic = "force-dynamic";

export default async function ExcusesPage({
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
  if (orgUser.role !== "admin") redirect(`/${slug}/dashboard`);

  const { data: requests, error: requestsError } = await supabase
    .from("excuse_requests")
    .select(`
      id, created_at, start_date, end_date, reason, status,
      reviewed_at, submitted_by,
      members ( id, full_name, class_name, parent_phone )
    `)
    .eq("organisation_id", orgUser.organisation_id)
    .order("created_at", { ascending: false });

  // Surface RLS / query errors in Vercel logs — this is the most common
  // cause of the dashboard showing a pending count but the page showing
  // nothing. Check logs at vercel.com → your project → Logs.
  if (requestsError) {
    console.error("[excuses page] fetch error:", requestsError.message, "code:", requestsError.code);
  }

  return (
    <ExcusesClient
      requests={(requests ?? []).map((r: any) => ({
        ...r,
        members: Array.isArray(r.members) ? r.members[0] ?? null : r.members,
      }))}
      orgId={orgUser.organisation_id}
      slug={slug}
    />
  );
}