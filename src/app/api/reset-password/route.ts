import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, school_slug } = await req.json()

  if (!email || !school_slug) {
    return NextResponse.json(
      { message: 'email and school_slug required' },
      { status: 400 }
    )
  }

  // Always return success to prevent email enumeration
  const silentSuccess = () => NextResponse.json({ success: true })

  // Verify school exists and is active
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('id, is_active')
    .eq('slug', school_slug)
    .single()

  if (!school || !school.is_active) return silentSuccess()

  // Find auth user by email
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  })
  const authUser = listData?.users?.find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (!authUser) return silentSuccess()

  // Verify user belongs to this school and is active
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', authUser.id)
    .eq('school_id', school.id)
    .single()

  if (!profile || !profile.is_active) return silentSuccess()

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://attendy-edu.vercel.app'

  // redirectTo must point to the /auth/confirm route handler.
  // Supabase appends token_hash and type query params automatically.
  // Our confirm route then verifies the token and redirects to set-password.
  const redirectTo = `${baseUrl}/${school_slug}/auth/confirm?next=/${school_slug}/auth/set-password`

  const { error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: email.toLowerCase(),
    options: { redirectTo },
  })

  if (error) {
    console.error('[reset-password] generateLink error:', error.message)
    // Still return success to avoid email enumeration
  }

  // Optional: log the reset request for audit (non-blocking, fire and forget)
  void supabaseAdmin.from('password_reset_log').insert({
    school_id: school.id,
    email: email.toLowerCase(),
  })

  return silentSuccess()
}