import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LandingPage from "./landing-page";

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; org?: string; slug?: string }>;
}) {
  const params = await searchParams;
  const slug = params.school || params.org || params.slug;

  if (slug) {
    const supabase = await createClient();
    const { data: org } = await supabase
      .from("organisations")
      .select("id, name, is_active, plan_expires_at")
      .eq("slug", slug.toLowerCase().trim())
      .eq("industry", "education")
      .single();

    if (!org) redirect(`/not-found-org?slug=${encodeURIComponent(slug)}`);
    if (!org.is_active) redirect(`/suspended?slug=${encodeURIComponent(slug)}`);
    if (org.plan_expires_at && new Date(org.plan_expires_at) < new Date()) {
      redirect(`/expired?slug=${encodeURIComponent(slug)}`);
    }
    redirect(`/${encodeURIComponent(slug)}/login`);
  }

  // No slug — check if already logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return <LandingPage />;
}