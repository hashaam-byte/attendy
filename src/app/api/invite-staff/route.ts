import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Uses service role key — only runs on server, never exposed to client
const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, full_name, phone, role, school_id } = await req.json()

  // Create auth user with a temp password — they'll get a reset email
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: Math.random().toString(36).slice(-12) + 'A1!',
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ message: authError.message }, { status: 400 })
  }

  // Create user profile
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      user_id: authUser.user.id,
      school_id,
      full_name,
      phone: phone || null,
      role,
    })

  if (profileError) {
    // Clean up auth user if profile fails
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ message: profileError.message }, { status: 500 })
  }

  // Send password reset so they can set their own password
  await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  return NextResponse.json({ success: true })
}