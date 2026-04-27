import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let proxyResponse = NextResponse.next({ request })

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

  const skipPrefixes = [
    '/head-admin', '/_next', '/favicon', '/api', '/setup', '/status', '/termii-test',
  ]
  if (skipPrefixes.some(p => pathname.startsWith(p))) return proxyResponse
  if (pathname === '/' || pathname === '/status') return proxyResponse

  const slugMatch = pathname.match(/^\/([^/]+)(?:\/|$)/)
  const slug = slugMatch?.[1]
  if (!slug) return proxyResponse

  const nonSchoolSlugs = [
    '_next', 'favicon', 'api', 'head-admin', 'setup', 'status', 'termii-test',
  ]
  if (nonSchoolSlugs.includes(slug)) return proxyResponse

  // ── Public auth paths — always accessible, no session required ──
  const publicAuthPaths = [
    '/login',
    '/auth/callback',
    '/auth/confirm',        // token_hash verification for reset/invite links
    '/auth/set-password',  // password set/reset form (session set by confirm route)
    '/auth/verify-otp',    // staff OTP verification
    '/parent/login',
  ]

  const isPublicAuthPath = publicAuthPaths.some(
    p => pathname === `/${slug}${p}` || pathname.startsWith(`/${slug}${p}`)
  )
  if (isPublicAuthPath) return proxyResponse

  // Parent routes use custom JWT (client-side localStorage) — skip Supabase check
  const isParentRoute = pathname.startsWith(`/${slug}/parent/`)
  if (isParentRoute) return proxyResponse

  // ── Session check ──
  let user: any = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error('[proxy] getUser() failed:', err)
    const isLoginPage = pathname.endsWith('/login')
    if (isLoginPage) return proxyResponse
    return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
  }

  const isLoginPage =
    pathname.endsWith('/login') || pathname === `/${slug}/login`

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

    if (profile && !profile.is_active) {
      try { await supabase.auth.signOut() } catch {}
      return NextResponse.redirect(
        new URL(`/${slug}/login?error=deactivated`, request.url)
      )
    }

    if (schoolRecord && profile?.school_id !== schoolRecord.id) {
      try { await supabase.auth.signOut() } catch {}
      return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
    }

    const role = profile?.role

    const roleHome: Record<string, string> = {
      admin:   `/${slug}/admin/dashboard`,
      teacher: `/${slug}/teacher/scan`,
      gateman: `/${slug}/gateman/scan`,
      parent:  `/${slug}/parent/my-child`,
    }

    if (isLoginPage && role) {
      return NextResponse.redirect(new URL(roleHome[role], request.url))
    }

    if (role && !isLoginPage) {
      const rolePrefixes = ['admin', 'teacher', 'gateman', 'parent']
      const matchedPrefix = rolePrefixes.find(
        r =>
          pathname.startsWith(`/${slug}/${r}/`) ||
          pathname === `/${slug}/${r}`
      )
      if (matchedPrefix && matchedPrefix !== role) {
        return NextResponse.redirect(new URL(roleHome[role], request.url))
      }
    }

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