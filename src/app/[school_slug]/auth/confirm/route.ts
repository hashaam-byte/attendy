import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ school_slug: string }> }
) {
  const { school_slug } = await params
  const { searchParams } = new URL(request.url)

  const token = searchParams.get('token')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? `/${school_slug}/auth/set-password`

  // Missing params — redirect to login with error
  if ((!token && !token_hash) || !type) {
    return NextResponse.redirect(
      new URL(`/${school_slug}/login?error=missing_token`, request.url)
    )
  }

  const cookieStore = await cookies()

  // IMPORTANT: We must use NextResponse.next() as the base so that
  // Set-Cookie headers from verifyOtp are written to the response
  // and survive the subsequent redirect.
  const response = NextResponse.redirect(new URL(next, request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // Write cookies onto the redirect response directly
        // so the browser receives the session cookie even on redirect
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Verify the OTP token — this establishes the session server-side
  const verifyParams: any = { type }
  if (token) verifyParams.token = token
  else verifyParams.token_hash = token_hash

  const { error } = await supabase.auth.verifyOtp(verifyParams)

  if (error) {
    console.error('[auth/confirm] verifyOtp error:', error)
    return NextResponse.redirect(
      new URL(`/${school_slug}/login?error=invalid_token`, request.url)
    )
  }

  // Token verified — the session cookies are now set on `response`.
  // Redirect to set-password (or wherever `next` points).
  // The proxy.ts middleware whitelists /auth/set-password so it won't
  // interfere with the user landing on that page.
  return response
}