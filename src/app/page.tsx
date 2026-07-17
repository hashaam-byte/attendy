import { createClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import LandingPage from "./landing-page";

// ── Fallback prices ────────────────────────────────────────────────────────
// Matches what's already hardcoded on attendy-web and in platform-settings.ts.
// Used only if the DB / RPC is unreachable.
const FALLBACK_PRICES = { trial: 0, basic: 12000, standard: 20000, premium: 35000, enterprise: 80000 };
const FALLBACK_LIMITS = {
  trial:      { members: 30,    sms: 100    },
  basic:      { members: 100,   sms: 500    },
  standard:   { members: 300,   sms: 2000   },
  premium:    { members: 1000,  sms: 10000  },
  enterprise: { members: 99999, sms: 999999 },
};

// Same pattern as attendy-web: anon key + get_public_prices() RPC (SECURITY
// DEFINER, granted to anon). This page is already fully dynamic (it reads
// cookies for auth), so prices are fetched fresh on every request — no ISR
// needed here, admin changes show up immediately on next page load.
async function getPrices() {
  try {
    const supabase = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase.rpc("get_public_prices");

    if (error || !data) {
      console.warn("[attendy] get_public_prices RPC failed:", error?.message, "— using fallback prices");
      return { prices: FALLBACK_PRICES, limits: FALLBACK_LIMITS };
    }

    return {
      prices: { ...FALLBACK_PRICES, ...data.prices },
      limits: { ...FALLBACK_LIMITS, ...data.limits },
    };
  } catch (err) {
    console.warn("[attendy] getPrices threw:", err, "— using fallback prices");
    return { prices: FALLBACK_PRICES, limits: FALLBACK_LIMITS };
  }
}

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

  const { prices, limits } = await getPrices();

  return <LandingPage prices={prices} limits={limits} />;
}