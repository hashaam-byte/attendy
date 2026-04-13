import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // CRITICAL: Only allow creation if NO head admin exists yet
  const { count } = await supabaseAdmin
    .from('head_admins')
    .select('id', { count: 'exact', head: true })

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { message: 'A head admin already exists. This setup page is permanently sealed.' },
      { status: 409 }
    )
  }

  const { email, password, full_name } = await req.json()

  if (!email || !password || !full_name) {
    return NextResponse.json({ message: 'All fields are required.' }, { status: 400 })
  }

  if (password.length < 12) {
    return NextResponse.json(
      { message: 'Password must be at least 12 characters.' },
      { status: 400 }
    )
  }

  // Hash the password with bcrypt
  const bcrypt = await import('bcryptjs')
  const password_hash = await bcrypt.hash(password, 12)

  const { error } = await supabaseAdmin
    .from('head_admins')
    .insert({
      email: email.toLowerCase().trim(),
      full_name: full_name.trim(),
      password_hash,
      is_active: true,
    })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
