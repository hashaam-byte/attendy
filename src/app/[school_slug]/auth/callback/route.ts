import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ school_slug: string }> }
) {
  const { school_slug } = await params
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type') // 'invite', 'recovery', etc.
  const error = requestUrl.searchParams.get('error')

  // OAuth provider returned an error
  if (error) {
    return NextResponse.redirect(
      new URL(`/${school_slug}/login?error=oauth_error`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/${school_slug}/login?error=no_code`, request.url)
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
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

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/${school_slug}/login?error=exchange_failed`, request.url)
    )
  }

  // ── Invite flow: redirect to set-password page ────────────────
  // When a teacher clicks their invite email link, type === 'invite'
  // We redirect them to set their password rather than straight to the app.
  if (type === 'invite') {
    return NextResponse.redirect(
      new URL(`/${school_slug}/auth/set-password`, request.url)
    )
  }

  // ── Recovery flow: redirect to set-password page ──────────────
  if (type === 'recovery') {
    return NextResponse.redirect(
      new URL(`/${school_slug}/auth/set-password`, request.url)
    )
  }

  // ── Normal OAuth / magic link flow ───────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    admin: `/${school_slug}/admin/dashboard`,
    teacher: `/${school_slug}/teacher/scan`,
    gateman: `/${school_slug}/gateman/scan`,
    parent: `/${school_slug}/parent/my-child`,
  }

  const destination = profile?.role
    ? roleRoutes[profile.role]
    : `/${school_slug}/login?error=no_profile`

  return NextResponse.redirect(new URL(destination, request.url))
}