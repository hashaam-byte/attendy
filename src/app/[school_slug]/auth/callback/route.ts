import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ school_slug: string }> }
) {
  const { school_slug } = await params
  const { searchParams } = new URL(request.url)

  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const error = searchParams.get('error')

  // OAuth/Supabase returned an error
  if (error) {
    return NextResponse.redirect(
      new URL(`/${school_slug}/login?error=oauth_error`, request.url)
    )
  }

  // token_hash flow — forward to /auth/confirm which handles verifyOtp
  if (token_hash && type) {
    const confirmUrl = new URL(`/${school_slug}/auth/confirm`, request.url)
    confirmUrl.searchParams.set('token_hash', token_hash)
    confirmUrl.searchParams.set('type', type)
    if (type === 'recovery') {
      confirmUrl.searchParams.set('next', `/${school_slug}/auth/set-password`)
    }
    return NextResponse.redirect(confirmUrl)
  }

  // No code and no token_hash
  if (!code) {
    return NextResponse.redirect(
      new URL(`/${school_slug}/login?error=no_code`, request.url)
    )
  }

  // PKCE code flow
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/${school_slug}/login?error=exchange_failed`, request.url)
    )
  }

  // Recovery type via code flow → set password
  if (type === 'recovery') {
    return NextResponse.redirect(
      new URL(`/${school_slug}/auth/set-password`, request.url)
    )
  }

  // Normal flow (magic link invite, OAuth) → route by role
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      new URL(`/${school_slug}/login?error=no_user`, request.url)
    )
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const roleRoutes: Record<string, string> = {
    admin:   `/${school_slug}/admin/dashboard`,
    teacher: `/${school_slug}/teacher/scan`,
    gateman: `/${school_slug}/gateman/scan`,
    parent:  `/${school_slug}/parent/my-child`,
  }

  const destination = profile?.role
    ? roleRoutes[profile.role]
    : `/${school_slug}/login?error=no_profile`

  return NextResponse.redirect(new URL(destination, request.url))
}