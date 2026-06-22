// src/app/[slug]/layout.tsx — ATTENDY-EDU v3
// CRITICAL: All dashboard routes live under /[slug]/ for proper school isolation
// Validates slug, loads org branding, provides OrgContext to all child pages

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SlugSidebar } from "@/components/layout/slug-sidebar";
import { SlugTopbar } from "@/components/layout/slug-topbar";
import { OrgProvider } from "@/context/org-context";

export default async function SlugDashboardLayout({
  children,
  params,
  searchParams,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Verify user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/login`);

  // 2. Get org_user with full org details
  const { data: orgUser } = await supabase
    .from("org_users")
    .select(`
      role, organisation_id,
      organisations (
        id, name, slug, industry, is_active, plan, plan_expires_at,
        logo_url, primary_color, max_members, settings
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) {
    await supabase.auth.signOut();
    redirect(`/${slug}/login`);
  }

  const org = orgUser.organisations as any;

  // 3. Ensure this user belongs to THIS specific slug
  if (org?.slug !== slug) {
    await supabase.auth.signOut();
    redirect(`/${slug}/login?error=wrong_school`);
  }

  // 4. Education only
  if (org?.industry !== "education") {
    await supabase.auth.signOut();
    redirect(`/${slug}/login`);
  }

  // 5. Suspended check
  if (!org?.is_active) {
    redirect(`/suspended?slug=${slug}`);
  }

  // 6. Gatemen → scanner directly (avoid infinite loop by using a query flag)
  if (orgUser.role === "gateman") {
    if (!searchParams?._gateman) {
      redirect(`/${slug}/scanner?_gateman=1`);
    }
  }

  const primaryColor = org?.primary_color || "#16a34a";
  const orgContext = {
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    planExpiresAt: org.plan_expires_at,
    logoUrl: org.logo_url,
    primaryColor,
    maxMembers: org.max_members,
    settings: org.settings || {},
  };

  return (
    <OrgProvider value={orgContext}>
      <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
        {/* Inject org primary color as CSS variable */}
        <style>{`:root { --org-color: ${primaryColor}; --org-color-light: ${primaryColor}20; --org-color-border: ${primaryColor}40; }`}</style>

        <SlugSidebar slug={slug} role={orgUser.role} orgName={org.name} primaryColor={primaryColor} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <SlugTopbar
            user={user}
            org={orgContext}
            role={orgUser.role}
            slug={slug}
          />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </OrgProvider>
  );
}