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

  const orgId = orgUser.organisation_id;

  // ── Step 1: fetch excuse_requests with NO join (same as dashboard count) ──
  // A relational join on members fails silently under RLS — Supabase drops
  // rows where the join sub-query returns nothing, making the page look empty
  // even though the dashboard count is correct.
  const { data: rawRequests, error: requestsError } = await supabase
    .from("excuse_requests")
    .select("id, created_at, start_date, end_date, reason, status, reviewed_at, submitted_by, member_id")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: false });

  if (requestsError) {
    console.error("[excuses page] fetch error:", requestsError.message, "code:", requestsError.code);
  }

  // ── Step 2: fetch member details separately using admin's authenticated context ──
  // This mirrors how the dashboard fetches students — a flat .select() with
  // no cross-table join, which is never affected by members RLS.
  const memberIds = [...new Set((rawRequests ?? []).map((r) => r.member_id).filter(Boolean))];

  let memberMap: Record<string, { id: string; full_name: string; class_name: string | null; parent_phone: string | null }> = {};

  if (memberIds.length > 0) {
    const { data: members } = await supabase
      .from("members")
      .select("id, full_name, class_name, parent_phone")
      .in("id", memberIds);

    for (const m of members ?? []) {
      memberMap[m.id] = m;
    }
  }

  // ── Step 3: stitch them together in JS ────────────────────────────────────
  const requests = (rawRequests ?? []).map((r) => ({
    ...r,
    members: memberMap[r.member_id] ?? null,
  }));

  return (
    <ExcusesClient
      requests={requests}
      orgId={orgId}
      slug={slug}
    />
  );
}