import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let proxyResponse = NextResponse.next({ request })

  // Guard: if Supabase env vars are missing, skip all auth logic
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error('[proxy] Missing Supabase env vars — skipping auth middleware')
    return proxyResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            proxyResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Skip head-admin, static, API routes — they handle their own auth
  const skipPrefixes = ['/head-admin', '/_next', '/favicon', '/api', '/setup']
  if (skipPrefixes.some(p => pathname.startsWith(p))) {
    return proxyResponse
  }

  // Skip root
  if (pathname === '/') return proxyResponse

  // Extract school slug — first path segment
  const slugMatch = pathname.match(/^\/([^/]+)(?:\/|$)/)
  const slug = slugMatch?.[1]

  if (!slug) return proxyResponse

  // Skip known non-school top-level routes
  const nonSchoolSlugs = ['_next', 'favicon', 'api', 'head-admin', 'setup', 'status']
  if (nonSchoolSlugs.includes(slug)) return proxyResponse

  const isLoginPage = pathname.endsWith('/login')
  const isCallbackPage = pathname.includes('/auth/callback')
  const isConfirmPage = pathname.includes('/auth/confirm')
  const isSetPasswordPage = pathname.includes('/auth/set-password')
  // OTP verification page — always public, no session required
  const isVerifyOtpPage = pathname.includes('/auth/verify-otp')
  const isStatusPage = pathname.endsWith('/status')

  // Always allow these auth flow pages through — no session required
  if (isCallbackPage || isConfirmPage || isSetPasswordPage || isVerifyOtpPage || isStatusPage) {
    return proxyResponse
  }

  // Wrap all auth logic in try/catch — a DB or auth error must NEVER
  // cause a 404. Worst case: let the page render and handle it there.
  let user: any = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error('[proxy] getUser() failed:', err)
    if (isLoginPage) return proxyResponse
    return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
  }

  // Not logged in → redirect to school login
  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
  }

  if (user) {
    let profile: any = null
    let schoolRecord: any = null

    try {
      const [profileRes, schoolRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('role, is_active, school_id')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('schools')
          .select('id, is_active')
          .eq('slug', slug)
          .single(),
      ])
      profile = profileRes.data
      schoolRecord = schoolRes.data
    } catch (err) {
      console.error('[proxy] profile/school lookup failed:', err)
      return proxyResponse
    }

    // Deactivated user account
    if (profile && !profile.is_active) {
      try {
        await supabase.auth.signOut()
      } catch {}
      return NextResponse.redirect(
        new URL(`/${slug}/login?error=deactivated`, request.url)
      )
    }

    // User belongs to a different school
    if (schoolRecord && profile?.school_id !== schoolRecord.id) {
      try {
        await supabase.auth.signOut()
      } catch {}
      return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
    }

    const role = profile?.role

    const roleHome: Record<string, string> = {
      admin:   `/${slug}/admin/dashboard`,
      teacher: `/${slug}/teacher/scan`,
      gateman: `/${slug}/gateman/scan`,
      parent:  `/${slug}/parent/my-child`,
    }

    // Already logged in and on login page → send to role home
    if (isLoginPage && role) {
      return NextResponse.redirect(new URL(roleHome[role], request.url))
    }

    // Role enforcement — block wrong role section
    if (role && !isLoginPage) {
      const rolePrefixes = ['admin', 'teacher', 'gateman', 'parent']
      const matchedPrefix = rolePrefixes.find(r =>
        pathname.startsWith(`/${slug}/${r}/`)
      )
      if (matchedPrefix && matchedPrefix !== role) {
        return NextResponse.redirect(new URL(roleHome[role], request.url))
      }
    }

    // Orphaned auth account (no profile) → redirect to login
    if (!profile && !isLoginPage) {
      return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
    }
  }

  return proxyResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|api/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf)).*)',
  ],
}