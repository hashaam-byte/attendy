

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

  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? `/${school_slug}/auth/set-password`

  // Missing params — redirect to login with error
  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL(`/${school_slug}/login?error=missing_token`, request.url)
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

  // Verify the OTP token — this establishes the session server-side
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    console.error('[auth/confirm] verifyOtp error:', error)
    return NextResponse.redirect(
      new URL(`/${school_slug}/login?error=invalid_token`, request.url)
    )
  }

  // Token verified — redirect to set-password (or wherever `next` points)
  return NextResponse.redirect(new URL(next, request.url))
}