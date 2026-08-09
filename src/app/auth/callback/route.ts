import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "invite" | "recovery" | "signup"
  const next = searchParams.get("next") ?? "/accept-invite";
  const slug = searchParams.get("slug"); // present only for the Google staff-login flow below

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* server component — ignore */ }
        },
      },
    }
  );

  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&message=${encodeURIComponent(error.message)}`
    );
  }

  // ── Google staff sign-in (from a specific school's /login page) ────
  // Distinguished from invite/recovery magic links by the presence of
  // `slug` — set by handleGoogleSignIn in [slug]/login/page.tsx. Google
  // auth alone only proves identity; org_users membership (checked
  // here, same rules as password login) still decides access.
  if (slug) {
    const loginUrl = (msg: string) =>
      NextResponse.redirect(`${origin}/${slug}/login?error=${encodeURIComponent(msg)}`);

    if (!sessionData.user) return loginUrl("Google sign-in failed. Please try again.");

    const { data: orgUser } = await supabase
      .from("org_users")
      .select("role, organisation_id, organisations(industry, is_active, slug)")
      .eq("user_id", sessionData.user.id)
      .eq("is_active", true)
      .single();

    if (!orgUser) {
      await supabase.auth.signOut();
      return loginUrl("This Google account isn't linked to any school staff account. Contact your admin, or sign in with your Attendy email/password instead.");
    }

    const org = Array.isArray(orgUser.organisations)
      ? (orgUser.organisations[0] as { industry: string; is_active: boolean; slug: string } | null)
      : (orgUser.organisations as { industry: string; is_active: boolean; slug: string } | null);

    if (org?.industry !== "education") {
      await supabase.auth.signOut();
      return loginUrl("This portal is for schools only.");
    }
    if (!org?.is_active) {
      await supabase.auth.signOut();
      return loginUrl("School account suspended. Contact Attendy.");
    }
    if (org?.slug !== slug) {
      await supabase.auth.signOut();
      return loginUrl("This Google account belongs to a different school. Sign in from your own school's login page.");
    }

    const destination = orgUser.role === "gateman" ? "scanner" : "dashboard";
    return NextResponse.redirect(`${origin}/${slug}/${destination}`);
  }

  // Route based on auth type
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  if (type === "invite") {
    return NextResponse.redirect(`${origin}/accept-invite`);
  }

  // Default — go to dashboard or the `next` param
  return NextResponse.redirect(`${origin}${next}`);
}