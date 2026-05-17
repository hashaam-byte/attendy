// src/proxy.ts — ATTENDY-EDU v3 / Next.js 16
//
// Next.js 16 changes applied:
//   • Named export is `proxy` (not `middleware`) — middleware is deprecated
//   • Runtime is always Node.js — edge runtime NOT supported in proxy
//   • Config key is still `matcher` (skipMiddlewareUrlNormalize →
//     skipProxyUrlNormalize if used, but we don't use it here)
//   • /portal and /portal/dashboard are explicitly excluded from slug logic
//   • Auth check stays as a lightweight gate — heavy auth in layouts/RSC
//     (per Vercel's post-CVE-2025-29927 recommendation)

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh auth session on every request (lightweight — no DB query)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ── Explicit top-level public paths ───────────────────────────
  // These must be checked BEFORE any slug parsing so that /portal,
  // /portal/dashboard etc. are never mistaken for a school slug.
  const TOP_LEVEL_PUBLIC = [
    "/",
    "/portal",
    "/portal/dashboard",
    "/accept-invite",
    "/reset-password",
    "/not-found-org",
    "/suspended",
    "/expired",
  ];

  const isTopLevelPublic =
    TOP_LEVEL_PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/scan/") ||   // /scan/[slug] — public gate scanner
    pathname.startsWith("/api/") ||    // API routes — never block
    pathname.startsWith("/_next/");    // Next.js internals (belt-and-suspenders)

  if (isTopLevelPublic) {
    return response;
  }

  // ── Slug-based routes: /[slug]/... ────────────────────────────
  // At this point pathname must be /something/something-else
  // e.g. /greenfield-academy/dashboard
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[0];   // e.g. "greenfield-academy"
  const page = segments[1];   // e.g. "dashboard"

  // Per-slug public pages — never redirect these even if unauthenticated
  const isSlugPublic =
    !page ||                          // bare /[slug] (shouldn't exist but safe)
    page === "login" ||               // /[slug]/login
    page === "accept-invite";         // /[slug]/accept-invite (rare edge case)

  if (isSlugPublic) {
    return response;
  }

  // ── Auth gate ─────────────────────────────────────────────────
  // Only redirects unauthenticated users away from protected slug routes.
  // Authenticated users are NOT redirected from /login here to avoid the
  // infinite-loop caused when layout's org-validation fails and boots to login.
  // Full authorisation (org membership, role, plan expiry) happens inside
  // each layout/page Server Component — proxy is intentionally lightweight.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}/login`;
    return NextResponse.redirect(url);
  }

  return response;
}

// Next.js 16: config export is unchanged (matcher key is still "matcher")
export const config = {
  matcher: [
    // Skip static assets; match everything else
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};