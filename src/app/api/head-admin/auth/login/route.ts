import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = new TextEncoder().encode(
  process.env.HEAD_ADMIN_JWT_SECRET ?? 'change-this-secret-in-production-min-32-chars!!'
)

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password required' }, { status: 400 })
  }

  // Look up head admin in DB
  const { data: admin, error } = await supabaseAdmin
    .from('head_admins')
    .select('id, email, full_name, password_hash, is_active')
    .eq('email', email.toLowerCase())
    .single()

  if (error || !admin) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }

  if (!admin.is_active) {
    return NextResponse.json({ message: 'Account deactivated' }, { status: 403 })
  }

  // Verify password using bcrypt (via Edge-compatible approach)
  const bcrypt = await import('bcryptjs')
  const valid = await bcrypt.compare(password, admin.password_hash)
  if (!valid) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }

  // Update last login
  await supabaseAdmin
    .from('head_admins')
    .update({ last_login: new Date().toISOString() })
    .eq('id', admin.id)

  // Issue JWT
  const token = await new SignJWT({
    sub: admin.id,
    email: admin.email,
    name: admin.full_name,
    role: 'head_admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET)

  // Set httpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set('head_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/head-admin',
  })

  return NextResponse.json({
    success: true,
    admin: { email: admin.email, name: admin.full_name },
  })
}