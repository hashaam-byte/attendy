import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Rate-limit store (in-memory, resets on cold start)
const resendTracker = new Map<string, number>()

export async function POST(req: NextRequest) {
  const { email, school_slug } = await req.json()

  if (!email || !school_slug) {
    return NextResponse.json({ message: 'email and school_slug required' }, { status: 400 })
  }

  const key = email.toLowerCase()

  // 60-second cooldown per email address
  const lastSent = resendTracker.get(key) ?? 0
  if (Date.now() - lastSent < 60_000) {
    const remaining = Math.ceil((60_000 - (Date.now() - lastSent)) / 1000)
    return NextResponse.json(
      { message: `Please wait ${remaining}s before requesting another code.` },
      { status: 429 }
    )
  }

  // Verify school exists and is active
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('id, is_active, slug')
    .eq('slug', school_slug)
    .single()

  if (!school || !school.is_active) {
    return NextResponse.json({ success: true }) // Don't reveal details
  }

  // Find the auth user by email
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const authUser = listData?.users?.find(u => u.email?.toLowerCase() === key)

  if (!authUser) {
    return NextResponse.json({ success: true }) // Don't reveal if user exists
  }

  // Verify they belong to this school and are active
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role, is_active, full_name')
    .eq('user_id', authUser.id)
    .eq('school_id', school.id)
    .single()

  if (!profile) {
    return NextResponse.json(
      { message: 'No staff profile found for this email at this school. Contact your admin.' },
      { status: 404 }
    )
  }

  if (!profile.is_active) {
    return NextResponse.json(
      { message: 'Your account has been deactivated. Contact your school admin.' },
      { status: 403 }
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://attendy-edu.vercel.app'
  const verifyUrl = `${baseUrl}/${school_slug}/auth/verify-otp?email=${encodeURIComponent(key)}`

  const isConfirmed = !!authUser.email_confirmed_at

  // Choose the right OTP type:
  // - Unconfirmed users → 'signup' type (sends 6-digit OTP)
  // - Confirmed users → 'magiclink' type (sends 6-digit OTP)
  const linkType = isConfirmed ? 'magiclink' : 'signup'

  const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: linkType,
    email: key,
    options: { redirectTo: verifyUrl },
  })

  if (linkError) {
    console.error('[resend-invite] generateLink error:', linkError.message, '| type:', linkType)

    // Fallback: try the other type
    const fallbackType = isConfirmed ? 'signup' : 'magiclink'
    const { error: fallbackError } = await supabaseAdmin.auth.admin.generateLink({
      type: fallbackType,
      email: key,
      options: { redirectTo: verifyUrl },
    })

    if (fallbackError) {
      return NextResponse.json(
        { message: 'Failed to send code. Please ask your admin to re-invite you.' },
        { status: 500 }
      )
    }
  }

  resendTracker.set(key, Date.now())

  return NextResponse.json({ success: true })
}