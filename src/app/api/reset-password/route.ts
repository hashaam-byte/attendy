import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Simple in-memory rate limit (resets on cold start — good enough for this)
const rateLimitMap = new Map<string, number>()

export async function POST(req: NextRequest) {
  const { email, school_slug } = await req.json()

  if (!email || !school_slug) {
    return NextResponse.json({ message: 'email and school_slug required' }, { status: 400 })
  }

  // Rate-limit: max 1 reset per email per 60s
  const key = email.toLowerCase()
  const lastSent = rateLimitMap.get(key) ?? 0
  if (Date.now() - lastSent < 60_000) {
    // Still return 200 to avoid email enumeration
    return NextResponse.json({ success: true })
  }
  rateLimitMap.set(key, Date.now())

  // Verify the user exists and belongs to this school
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const authUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === key)

  if (!authUser) {
    // Silent fail — don't reveal whether email exists
    return NextResponse.json({ success: true })
  }

  // Verify the school exists and is active
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('id, is_active')
    .eq('slug', school_slug)
    .single()

  if (!school || !school.is_active) {
    return NextResponse.json({ success: true })
  }

  // Verify user belongs to this school and is active
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', authUser.id)
    .eq('school_id', school.id)
    .single()

  if (!profile || !profile.is_active) {
    return NextResponse.json({ success: true })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://attendy-edu.vercel.app'

  // FIXED: Point to the existing /auth/callback route which already handles type=recovery
  // It will redirect to /auth/set-password after exchanging the code for a session
  const redirectTo = `${baseUrl}/${school_slug}/auth/callback?type=recovery`

  const { error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: key,
    options: { redirectTo },
  })

  if (error) {
    console.error('[reset-password] generateLink error:', error)
    // Still return success to avoid email enumeration
  }

  return NextResponse.json({ success: true })
}