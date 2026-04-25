import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, school_slug } = await req.json()

  console.log(`[reset-password] Request: email=${email}, school=${school_slug}`)

  if (!email || !school_slug) {
    console.warn('[reset-password] Missing email or school_slug')
    return NextResponse.json({ message: 'email and school_slug required' }, { status: 400 })
  }

  // Verify the user exists and belongs to this school
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const authUser = existingUsers?.users?.find(u => u.email === email)

  if (!authUser) {
    console.log(`[reset-password] User not found: ${email}`)
    // Don't reveal whether email exists — just say "if account exists, email sent"
    return NextResponse.json({ success: true })
  }

  console.log(`[reset-password] User found: ${authUser.id}`)

  // Verify the school
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('id, is_active')
    .eq('slug', school_slug)
    .single()

  if (!school || !school.is_active) {
    console.log(`[reset-password] School not found or inactive: ${school_slug}`)
    return NextResponse.json({ success: true }) // silent fail
  }

  console.log(`[reset-password] School verified: ${school.id}`)

  // Verify user belongs to this school
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', authUser.id)
    .eq('school_id', school.id)
    .single()

  if (!profile || !profile.is_active) {
    console.log(`[reset-password] User not in school or inactive`)
    return NextResponse.json({ success: true }) // silent fail
  }

  console.log(`[reset-password] Profile verified: role=${profile.role}`)

  // Build the redirect URL — goes through our confirm route which sets the session
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://attendy-edu.vercel.app'
  const redirectTo = `${baseUrl}/${school_slug}/auth/confirm?next=/${school_slug}/auth/set-password`

  console.log(`[reset-password] Redirect URL: ${redirectTo}`)

  // Send password reset email via Supabase
  console.log(`[reset-password] Calling generateLink...`)
  const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo,
    },
  })

  if (error) {
    console.error('[reset-password] ❌ generateLink ERROR:', error)
    // Still return success to avoid email enumeration
  } else {
    console.log(`[reset-password] ✅ generateLink SUCCESS - email sent to ${email}`)
    if (linkData?.properties?.action_link) {
      console.log(`[reset-password] 📧 Recovery link: ${linkData.properties.action_link}`)
    }
  }

  return NextResponse.json({ success: true })
}