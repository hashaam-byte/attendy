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

    // Create the profile for the existing user
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: existingUser.id,
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

    // For existing users: use signInWithOtp which reliably sends a 6-digit code
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: {
        shouldCreateUser: false, // user already exists
        emailRedirectTo: verifyUrl,
      },
    })

    if (otpError) {
      console.error('[invite-staff] signInWithOtp error for existing user:', otpError)
      // Profile was created — tell admin to share the verify link
      return NextResponse.json({
        success: true,
        message: `Profile created for ${email}. Email sending failed — share the verification link manually.`,
        verify_url: verifyUrl,
        email_sent: false,
      })
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${email}.`,
      verify_url: verifyUrl,
      email_sent: true,
    })
  }

  // ── NEW USER FLOW ──
  // Step 1: Use inviteUserByEmail — this ALWAYS sends an email reliably
  // We'll handle the profile creation via metadata + webhook, or right after
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email.toLowerCase(),
    {
      redirectTo: verifyUrl,
      data: {
        pending_school_id: school_id,
        pending_role: role,
        pending_full_name: full_name,
        pending_phone: phone ?? null,
        school_name: school?.name ?? schoolSlug,
        school_slug: schoolSlug,
      },
    }
  )

  if (inviteError || !inviteData?.user) {
    console.error('[invite-staff] inviteUserByEmail error:', inviteError)
    return NextResponse.json(
      { message: inviteError?.message ?? 'Failed to send invite email' },
      { status: 400 }
    )
  }

  const authUserId = inviteData.user.id

  // Step 2: Create the profile immediately
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
    // Profile creation failed but invite email already sent
    // Don't delete the auth user — they can still set up via the invite link
    console.error('[invite-staff] profile insert error:', profileError)
    // Try upsert as fallback
    await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: authUserId,
        school_id,
        full_name,
        phone: phone || null,
        role,
        is_active: true,
      }, { onConflict: 'user_id' })
  }

  // Step 3: Also send a separate OTP so they can use the verify-otp page
  // The invite email contains a magic link; we ALSO send an OTP for our custom verify flow
  const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
    email: email.toLowerCase(),
    options: {
      shouldCreateUser: false, // already created above
      emailRedirectTo: verifyUrl,
    },
  })

  if (otpError) {
    // Invite email was already sent — OTP is a bonus. Log and continue.
    console.warn('[invite-staff] OTP send failed (invite email already sent):', otpError.message)
  }

  return NextResponse.json({
    success: true,
    message: `An invitation email with a verification code has been sent to ${email}.`,
    verify_url: verifyUrl,
    email_sent: true,
  })
}