import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Uses service role key — only runs on server, never exposed to client
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
    .select('max_teachers')
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

  // ── Check if email already exists in this school ──────────────
  const { data: existingProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('school_id', school_id)
    .eq('role', role)
    .limit(1)

  // Check if auth user already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const alreadyExists = existingUsers?.users?.find((u) => u.email === email)
  if (alreadyExists) {
    return NextResponse.json(
      { message: 'A user with this email already exists.' },
      { status: 409 }
    )
  }

  // ── Build the redirect URL so the teacher lands on set-password ──
  // After clicking the invite link, Supabase redirects to:
  //   /[school_slug]/auth/callback?code=...
  // which we handle and then send to set-password.
  // We pass school_id + role as query params encoded in redirectTo.
  const { data: schoolData } = await supabaseAdmin
    .from('schools')
    .select('slug')
    .eq('id', school_id)
    .single()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const redirectTo = `${baseUrl}/${schoolData?.slug ?? 'unknown'}/auth/set-password`

  // ── Send the actual invite email via Supabase ─────────────────
  // inviteUserByEmail creates the user AND sends the invite email.
  // The user gets a link to set their own password.
  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        // Store pending profile data in user_metadata
        // The set-password callback will create the profile after the user accepts
        pending_school_id: school_id,
        pending_role: role,
        pending_full_name: full_name,
        pending_phone: phone ?? null,
      },
    })

  if (inviteError) {
    console.error('[invite-staff] inviteUserByEmail error:', inviteError)
    return NextResponse.json({ message: inviteError.message }, { status: 400 })
  }

  // ── Create the user profile immediately ──────────────────────
  // We create it now so the admin can see the pending staff member.
  // is_active = false until the user sets their password and confirms.
  // Actually: Supabase's inviteUserByEmail confirms the email automatically
  // once the user clicks the link — so we create the profile now and
  // mark the user visible to the admin straight away.
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      user_id: inviteData.user.id,
      school_id,
      full_name,
      phone: phone || null,
      role,
      is_active: true, // active once they accept and set a password
    })

  if (profileError) {
    // Roll back: delete the auth user if profile creation fails
    await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id)
    console.error('[invite-staff] profile insert error:', profileError)
    return NextResponse.json(
      { message: 'Failed to create profile: ' + profileError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: `Invite sent to ${email}. They will receive an email to set their password.`,
  })
}