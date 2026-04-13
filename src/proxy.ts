import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let proxyResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Extract school slug — first path segment
  const slugMatch = pathname.match(/^\/([^\/]+)(?:\/|$)/)
  const slug = slugMatch?.[1]

  // Skip head-admin, static, API routes — they handle their own auth
  const skipPrefixes = ['/head-admin', '/_next', '/favicon', '/api']
  if (skipPrefixes.some(p => pathname.startsWith(p))) {
    return proxyResponse
  }

  // Skip root path and non-school paths
  if (!slug || slug === '') return proxyResponse

  // Skip known non-school top-level routes
  const nonSchoolSlugs = ['_next', 'favicon', 'api', 'head-admin']
  if (nonSchoolSlugs.includes(slug)) return proxyResponse

  const isLoginPage = pathname.endsWith('/login')
  const isCallbackPage = pathname.includes('/auth/callback')

  // Allow OAuth callback through without auth check
  if (isCallbackPage) return proxyResponse

  // Not logged in → redirect to school login
  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
  }

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_active, school_id')
      .eq('user_id', user.id)
      .single()

    // Deactivated account — sign out and redirect
    if (profile && !profile.is_active) {
      const response = NextResponse.redirect(new URL(`/${slug}/login`, request.url))
      // Clear the session cookies
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      return response
    }

    const role = profile?.role

    const roleHome: Record<string, string> = {
      admin:   `/${slug}/admin/dashboard`,
      teacher: `/${slug}/teacher/scan`,
      gateman: `/${slug}/gateman/scan`,
      parent:  `/${slug}/parent/my-child`,
    }

    // Already logged in, on login page → send to role home
    if (isLoginPage && role) {
      return NextResponse.redirect(new URL(roleHome[role], request.url))
    }

    // Role enforcement — block access to wrong role section
    if (role && !isLoginPage) {
      const rolePrefixes = ['admin', 'teacher', 'gateman', 'parent']
      const matchedPrefix = rolePrefixes.find(r => pathname.startsWith(`/${slug}/${r}/`))

      if (matchedPrefix && matchedPrefix !== role) {
        return NextResponse.redirect(new URL(roleHome[role], request.url))
      }
    }

    // No profile found for this auth user — orphaned account, redirect to login
    if (!profile && !isLoginPage) {
      return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
    }
  }

  return proxyResponse
}

export const config = {
  // Exclude: static files, images, favicon, API routes, auth callbacks
  // These handle their own auth — proxy must never intercept them
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|api/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf)).*)',
  ],
}