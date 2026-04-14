import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, school_slug } = await req.json()

  if (!email || !school_slug) {
    return NextResponse.json({ message: 'email and school_slug required' }, { status: 400 })
  }

  // Verify the user exists and belongs to this school
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const authUser = existingUsers?.users?.find(u => u.email === email)

  if (!authUser) {
    // Don't reveal whether email exists — just say "if account exists, email sent"
    return NextResponse.json({ success: true })
  }

  // Verify the school
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('id, is_active')
    .eq('slug', school_slug)
    .single()

  if (!school || !school.is_active) {
    return NextResponse.json({ success: true }) // silent fail
  }

  // Verify user belongs to this school
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', authUser.id)
    .eq('school_id', school.id)
    .single()

  if (!profile || !profile.is_active) {
    return NextResponse.json({ success: true }) // silent fail
  }

  // Build the redirect URL — goes through our confirm route which sets the session
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const redirectTo = `${baseUrl}/${school_slug}/auth/confirm?next=/${school_slug}/auth/set-password`

  // Send password reset email via Supabase
  const { error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo,
    },
  })

  if (error) {
    console.error('[reset-password] generateLink error:', error)
    // Still return success to avoid email enumeration
  }

  return NextResponse.json({ success: true })
}