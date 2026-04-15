import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { email, full_name, phone, role, school_id } = await req.json()

  if (!email || !full_name || !role || !school_id) {
    return NextResponse.json(
      { message: 'email, full_name, role and school_id are required' },
      { status: 400 }
    )
  }

  if (!['teacher', 'gateman'].includes(role)) {
    return NextResponse.json({ message: 'Invalid role' }, { status: 400 })
  }

  // Verify caller is an admin for this exact school
  const { data: callerProfile } = await supabase
    .from('user_profiles')
    .select('school_id, role')
    .eq('user_id', user.id)
    .single()

  if (
    !callerProfile ||
    callerProfile.role !== 'admin' ||
    callerProfile.school_id !== school_id
  ) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  // Plan limit check
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('max_teachers, slug, name')
    .eq('id', school_id)
    .single()

  const { count: currentTeachers } = await supabaseAdmin
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', school_id)
    .in('role', ['teacher', 'gateman'])

  if (school && (currentTeachers ?? 0) >= school.max_teachers) {
    return NextResponse.json(
      { message: `Teacher/staff limit reached (${school.max_teachers}). Upgrade your plan.` },
      { status: 403 }
    )
  }

  const schoolSlug = school?.slug ?? 'unknown'
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://attendy-edu.vercel.app'
  const verifyUrl = `${baseUrl}/${schoolSlug}/auth/verify-otp?email=${encodeURIComponent(email.toLowerCase())}`

  // Check if auth user already exists
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = listData?.users?.find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  )

  let authUserId: string

  if (existingUser) {
    // Check for duplicate profile in same school
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('user_id', existingUser.id)
      .eq('school_id', school_id)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { message: 'A staff member with this email already exists for this school.' },
        { status: 409 }
      )
    }

    authUserId = existingUser.id

    // Create the profile for the existing user
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authUserId,
        school_id,
        full_name,
        phone: phone || null,
        role,
        is_active: true,
      })

    if (profileError) {
      return NextResponse.json(
        { message: 'Failed to create profile: ' + profileError.message },
        { status: 500 }
      )
    }

    // Send OTP to existing (already confirmed) user via magiclink generateLink
    // This generates a new OTP token they can use to re-authenticate
    const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
      options: { redirectTo: verifyUrl },
    })

    if (linkError) {
      console.error('[invite-staff] generateLink (magiclink) error:', linkError)
      // Profile was created, just notify that email sending failed
      return NextResponse.json({
        success: true,
        message: `Profile created for ${email} but email sending failed. Ask them to use "Forgot Password" to set their password.`,
        verify_url: verifyUrl,
        email_sent: false,
      })
    }

  } else {
    // ── New user: Create the auth user first with a dummy password, then send OTP ──
    // We do NOT use inviteUserByEmail because it sends a confirmation URL (not a 6-digit code)
    // Instead: create user → generate email OTP → user verifies OTP → sets password

    // Step 1: Create the auth user (unconfirmed)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: false, // Keep unconfirmed so OTP verification confirms them
      user_metadata: {
        pending_school_id: school_id,
        pending_role: role,
        pending_full_name: full_name,
        pending_phone: phone ?? null,
        school_name: school?.name ?? schoolSlug,
        school_slug: schoolSlug,
      },
    })

    if (createError || !newUser?.user) {
      return NextResponse.json(
        { message: createError?.message ?? 'Failed to create user account' },
        { status: 400 }
      )
    }

    authUserId = newUser.user.id

    // Step 2: Create the profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authUserId,
        school_id,
        full_name,
        phone: phone || null,
        role,
        is_active: true,
      })

    if (profileError) {
      // Rollback the auth user
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json(
        { message: 'Failed to create profile: ' + profileError.message },
        { status: 500 }
      )
    }

    // Step 3: Generate and send OTP email
    // Using 'signup' type generates a 6-digit OTP for unconfirmed users
    const { error: otpError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email.toLowerCase(),
      password: 'temporary-password-will-be-reset',
      options: { redirectTo: verifyUrl },
    })

    if (otpError) {
      console.error('[invite-staff] generateLink (signup OTP) error:', otpError)
      // Don't rollback — profile exists, user can use resend flow
      return NextResponse.json({
        success: true,
        message: `Account created for ${email} but OTP email failed to send. Use the resend option.`,
        verify_url: verifyUrl,
        email_sent: false,
      })
    }
  }

  return NextResponse.json({
    success: true,
    message: `A 6-digit verification code has been sent to ${email}.`,
    verify_url: verifyUrl,
    email_sent: true,
  })
}