// src/app/scan/[slug]/page.tsx — ATTENDY-EDU v3
// Public scanner — no login required. Used by gatemen on shared tablets.
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ScannerClient } from "@/app/[slug]/scanner/scanner-client";

export const dynamic = "force-dynamic";

export default async function PublicScannerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organisations")
    .select("id, name, is_active, industry, plan, plan_expires_at, primary_color, settings")
    .eq("slug", slug)
    .eq("industry", "education")
    .eq("is_active", true)
    .single();

  if (!org) notFound();

  if (org.plan_expires_at && new Date(org.plan_expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4">
        <div className="card p-8 max-w-sm text-center">
          <p className="text-2xl mb-3">⚠️</p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Subscription Expired</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This school's Attendy subscription has expired. Please contact your school admin to renew.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScannerClient
      orgId={org.id}
      orgName={org.name}
      orgSlug={slug}
      role="gateman"
      userId="public-scanner"
      primaryColor={org.primary_color || "#16a34a"}
      settings={(org.settings as any) || {}}
      isPublicScanner={true}
    />
  );
}