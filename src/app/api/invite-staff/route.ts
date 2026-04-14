import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  // ── Plan limit check ─────────────────────────────────────────
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
      {
        message: `Teacher/staff limit reached (${school.max_teachers}). Upgrade your plan to add more.`,
      },
      { status: 403 }
    )
  }

  // ── Check if auth user already exists ──────────────────────
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const alreadyExists = existingUsers?.users?.find((u) => u.email === email)

  let authUserId: string

  if (alreadyExists) {
    // User exists — check if they already have a profile for this school
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('user_id', alreadyExists.id)
      .eq('school_id', school_id)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { message: 'A staff member with this email already exists for this school.' },
        { status: 409 }
      )
    }
    authUserId = alreadyExists.id
  } else {
    // Create new auth user with a temporary random password
    // They will set their real password after OTP verification
    const tempPassword = crypto.randomUUID() + crypto.randomUUID()
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // they'll confirm via OTP
      user_metadata: {
        pending_school_id: school_id,
        pending_role: role,
        pending_full_name: full_name,
        pending_phone: phone ?? null,
      },
    })

    if (createError || !newUser?.user) {
      return NextResponse.json({ message: createError?.message ?? 'Failed to create user' }, { status: 400 })
    }
    authUserId = newUser.user.id
  }

  // ── Create user profile immediately ─────────────────────────
  if (!alreadyExists) {
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
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json(
        { message: 'Failed to create profile: ' + profileError.message },
        { status: 500 }
      )
    }
  }

  // ── Send OTP email via Supabase signInWithOtp ────────────────
  // We use the admin client's generateLink for OTP type to get a 6-digit code
  // sent to the user's email. The user will enter this on the verify-otp page.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const schoolSlug = school?.slug ?? 'unknown'

  // Use signInWithOtp from the anon key client — this sends a 6-digit code
  // We create a temporary browser-like client to trigger the OTP email
  const { createClient: createBrowserLike } = await import('@supabase/supabase-js')
  const anonClient = createBrowserLike(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error: otpError } = await anonClient.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // user already exists
      data: {
        school_name: school?.name ?? schoolSlug,
        school_slug: schoolSlug,
        staff_name: full_name,
      },
    },
  })

  if (otpError) {
    console.error('[invite-staff] OTP send error:', otpError)
    // Don't fail the whole invite — profile is created, admin can ask them to use "forgot password"
    return NextResponse.json(
      { message: 'Staff added but email failed to send: ' + otpError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: `A 6-digit verification code has been sent to ${email}. The staff member should check their inbox and enter the code at ${baseUrl}/${schoolSlug}/auth/verify-otp`,
    verify_url: `${baseUrl}/${schoolSlug}/auth/verify-otp`,
  })
}