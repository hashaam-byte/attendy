// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Extract school slug from URL: /greenfield-academy/admin/dashboard
  const slugMatch = pathname.match(/^\/([^\/]+)\//)
  const slug = slugMatch?.[1]

  // Skip head-admin and static routes
  if (
    pathname.startsWith('/head-admin') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return supabaseResponse
  }

  // Not logged in — redirect to school login
  if (!user && slug && !pathname.includes('/login')) {
    return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
  }

  // Logged in — get their role and redirect if on wrong section
  if (user && slug) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role
    const roleRoutes: Record<string, string> = {
      admin: `/${slug}/admin/dashboard`,
      teacher: `/${slug}/teacher/scan`,
      gateman: `/${slug}/gateman/scan`,
      parent: `/${slug}/parent/my-child`,
    }

    // If logged in user hits /login, send them to their dashboard
    if (pathname.includes('/login') && role) {
      return NextResponse.redirect(new URL(roleRoutes[role], request.url))
    }

    // Block wrong-role access
    if (role && !pathname.includes(`/${role}/`) && !pathname.includes('/login')) {
      return NextResponse.redirect(new URL(roleRoutes[role], request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}