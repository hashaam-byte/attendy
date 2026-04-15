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

  // Check if auth user already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const alreadyExists = existingUsers?.users?.find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  )

  let authUserId: string

  if (alreadyExists) {
    // Check for duplicate profile in same school
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
  } else {
    // ── Use inviteUserByEmail — this creates the user AND sends the Invite email template.
    // The Invite template supports both {{ .Token }} (6-digit code) and {{ .ConfirmationURL }}
    // (direct link). This sends EXACTLY ONE email. No double-send.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://attendy-edu.vercel.app'
    const schoolSlug = school?.slug ?? 'unknown'
    const verifyUrl = `${baseUrl}/${schoolSlug}/auth/verify-otp?email=${encodeURIComponent(email.toLowerCase())}`

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
      return NextResponse.json(
        { message: inviteError?.message ?? 'Failed to send invite' },
        { status: 400 }
      )
    }

    authUserId = inviteData.user.id

    // Create the profile
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
      // Rollback the auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json(
        { message: 'Failed to create profile: ' + profileError.message },
        { status: 500 }
      )
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://attendy-edu.vercel.app'
  const schoolSlug = school?.slug ?? 'unknown'
  const verifyUrl = `${baseUrl}/${schoolSlug}/auth/verify-otp?email=${encodeURIComponent(email.toLowerCase())}`

  return NextResponse.json({
    success: true,
    message: `Invite sent to ${email}. They will receive a 6-digit code and a direct link.`,
    verify_url: verifyUrl,
  })
}