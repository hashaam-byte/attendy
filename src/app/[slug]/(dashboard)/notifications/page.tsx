// src/app/[slug]/(dashboard)/notifications/page.tsx — ATTENDY-EDU v4
// SMS log — shows every message sent, full text, who received it.
// Uses two separate queries (no relational join) to avoid RLS silently
// dropping rows the same way the excuses page was broken.
// Also shows app version banner so admin can push update prompts.

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { NotificationsClient } from "./notifications-client";

export const dynamic = "force-dynamic";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function NotificationsPage({
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
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();
  if (!orgUser) redirect(`/${slug}/login`);

  const orgId      = orgUser.organisation_id;
  const todayStart = new Date().toISOString().split("T")[0];

  // ── Step 1: fetch logs with NO relational join ────────────────────────────
  // members(full_name) join fails under RLS — student column shows "—".
  // Fetch flat then stitch member names separately.
  const [logsRes, todayRes, failedRes] = await Promise.all([
    adminSupabase
      .from("notifications_log")
      .select("id, sent_at, recipient, message, status, channel, member_id")
      .eq("organisation_id", orgId)
      .order("sent_at", { ascending: false })
      .limit(200),

    adminSupabase
      .from("notifications_log")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .gte("sent_at", `${todayStart}T00:00:00`),

    adminSupabase
      .from("notifications_log")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("status", "failed")
      .gte("sent_at", new Date(Date.now() - 86400000).toISOString()),
  ]);

  const rawLogs = logsRes.data ?? [];

  // ── Step 2: fetch member names separately ─────────────────────────────────
  const memberIds = [...new Set(
    rawLogs.map((l) => l.member_id).filter(Boolean)
  )] as string[];

  let nameMap: Record<string, string> = {};
  if (memberIds.length > 0) {
    const { data: members } = await adminSupabase
      .from("members")
      .select("id, full_name")
      .in("id", memberIds);
    for (const m of members ?? []) {
      nameMap[m.id] = m.full_name;
    }
  }

  // ── Step 3: stitch ────────────────────────────────────────────────────────
  const logs = rawLogs.map((l) => ({
    ...l,
    full_name: l.member_id ? (nameMap[l.member_id] ?? null) : null,
  }));

  // ── App version from platform_settings ───────────────────────────────────
  const { data: versionRow } = await adminSupabase
    .from("platform_settings")
    .select("value, updated_at")
    .eq("key", "app_version")
    .single();

  const appVersion = versionRow?.value as { latest?: string; force?: boolean } | null;

  return (
    <NotificationsClient
      logs={logs}
      todayCount={todayRes.count ?? 0}
      failedCount={failedRes.count ?? 0}
      orgId={orgId}
      slug={slug}
      appVersion={appVersion ?? null}
      isAdmin={orgUser.role === "admin"}
    />
  );
}