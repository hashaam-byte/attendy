// src/proxy.ts
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

  // Skip head-admin, static, and API routes
  const skipPrefixes = ['/head-admin', '/_next', '/favicon', '/api']
  if (skipPrefixes.some(p => pathname.startsWith(p))) {
    return proxyResponse
  }

  // Skip if no slug detected or it's a root path
  if (!slug || slug === '') return proxyResponse

  const isLoginPage = pathname.endsWith('/login')

  // Not logged in → redirect to school login
  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
  }

  // Logged in
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role

    const roleHome: Record<string, string> = {
      admin:   `/${slug}/admin/dashboard`,
      teacher: `/${slug}/teacher/scan`,
      gateman: `/${slug}/gateman/scan`,
      parent:  `/${slug}/parent/my-child`,
    }

    // If on login page and already authed, send to role home
    if (isLoginPage && role) {
      return NextResponse.redirect(new URL(roleHome[role], request.url))
    }

    // Block access to wrong role section
    if (role && !isLoginPage) {
      const allowedPrefix = `/${slug}/${role}/`
      const isAdminPath = pathname.startsWith(`/${slug}/admin/`)
      const isTeacherPath = pathname.startsWith(`/${slug}/teacher/`)
      const isGatemanPath = pathname.startsWith(`/${slug}/gateman/`)
      const isParentPath = pathname.startsWith(`/${slug}/parent/`)

      const isRolePath = isAdminPath || isTeacherPath || isGatemanPath || isParentPath

      if (isRolePath && !pathname.startsWith(`/${slug}/${role}/`)) {
        return NextResponse.redirect(new URL(roleHome[role], request.url))
      }
    }

    // Deactivated account
    if (profile && !profile.is_active) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
    }
  }

  return proxyResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}