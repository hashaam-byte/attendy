/**
 * proxy.ts  (Next.js 16 — replaces middleware.ts)
 *
 * IMPORTANT SECURITY NOTE:
 * This proxy handles REDIRECTS only — it is NOT the security layer.
 * Real security is enforced by:
 *   1. Supabase RLS policies (database level)
 *   2. Server-side auth checks in each page/API route
 *
 * The proxy's job is purely UX: redirect unauthenticated users to login,
 * and redirect already-authenticated users away from the login page.
 *
 * We deliberately keep DB calls minimal here to avoid latency on every request.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Guard: missing env vars → skip all auth logic
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error('[proxy] Missing Supabase env vars — skipping auth middleware')
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // ── Skip non-school routes entirely ──────────────────────────
  const skipPrefixes = [
    '/head-admin',
    '/_next',
    '/favicon',
    '/api',
    '/setup',
    '/status',
  ]
  if (
    pathname === '/' ||
    skipPrefixes.some((p) => pathname.startsWith(p))
  ) {
    return response
  }

  // Extract school slug (first path segment)
  const slugMatch = pathname.match(/^\/([^/]+)(?:\/|$)/)
  const slug = slugMatch?.[1]
  if (!slug) return response

  const nonSchoolSlugs = new Set([
    '_next',
    'favicon',
    'api',
    'head-admin',
    'setup',
    'status',
  ])
  if (nonSchoolSlugs.has(slug)) return response

  const isLoginPage = pathname.endsWith('/login')
  const isAuthPage =
    pathname.includes('/auth/callback') ||
    pathname.includes('/auth/set-password')

  // Always allow auth flow pages through — they handle their own logic
  if (isAuthPage) return response

  // ── Get session (lightweight — just reads the cookie, no DB call) ──
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error('[proxy] getUser() failed:', err)
    if (isLoginPage) return response
    return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
  }

  // Not logged in → redirect to school login
  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
  }

  // Already logged in and trying to reach login page → send to app
  if (user && isLoginPage) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, is_active, school_id')
        .eq('user_id', user.id)
        .single()

      // Deactivated account
      if (profile && !profile.is_active) {
        await supabase.auth.signOut()
        return NextResponse.redirect(
          new URL(`/${slug}/login?error=deactivated`, request.url)
        )
      }

      const roleRoutes: Record<string, string> = {
        admin: `/${slug}/admin/dashboard`,
        teacher: `/${slug}/teacher/scan`,
        gateman: `/${slug}/gateman/scan`,
        parent: `/${slug}/parent/my-child`,
      }

      if (profile?.role && roleRoutes[profile.role]) {
        return NextResponse.redirect(
          new URL(roleRoutes[profile.role], request.url)
        )
      }
    } catch (err) {
      console.error('[proxy] profile lookup failed on login page:', err)
    }
    return response
  }

  // ── Role enforcement (logged in, accessing a protected section) ──
  if (user && !isLoginPage) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, is_active, school_id')
        .eq('user_id', user.id)
        .single()

      if (!profile) {
        // Orphaned auth user — sign out and redirect
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
      }

      if (!profile.is_active) {
        await supabase.auth.signOut()
        return NextResponse.redirect(
          new URL(`/${slug}/login?error=deactivated`, request.url)
        )
      }

      // User belongs to a different school
      const { data: schoolRecord } = await supabase
        .from('schools')
        .select('id')
        .eq('slug', slug)
        .single()

      if (schoolRecord && profile.school_id !== schoolRecord.id) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
      }

      // Block a teacher trying to access /admin, etc.
      const roleSections = ['admin', 'teacher', 'gateman', 'parent']
      const accessedSection = roleSections.find((r) =>
        pathname.startsWith(`/${slug}/${r}/`)
      )

      const roleRoutes: Record<string, string> = {
        admin: `/${slug}/admin/dashboard`,
        teacher: `/${slug}/teacher/scan`,
        gateman: `/${slug}/gateman/scan`,
        parent: `/${slug}/parent/my-child`,
      }

      if (
        accessedSection &&
        accessedSection !== profile.role
      ) {
        return NextResponse.redirect(
          new URL(roleRoutes[profile.role] ?? `/${slug}/login`, request.url)
        )
      }
    } catch (err) {
      console.error('[proxy] role enforcement failed:', err)
      // Don't block — let the page itself handle it
    }
  }

  return response
}

export const config = {
  runtime: 'nodejs', // Next.js 16 proxy runs on Node.js runtime
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|api/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf)).*)',
  ],
}