import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PARENT_JWT_SECRET = new TextEncoder().encode(
  process.env.PARENT_JWT_SECRET ?? 'parent-jwt-secret-attendy-change-in-prod-32chars!!'
)

// Simple in-memory rate limit: max 5 attempts per phone per 15 min
const attemptMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = attemptMap.get(key)
  if (!entry || now > entry.resetAt) {
    attemptMap.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const { phone, school_slug } = await req.json()

  if (!phone || !school_slug) {
    return NextResponse.json({ message: 'Phone number and school required' }, { status: 400 })
  }

  // Rate limit by IP + phone
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const rateLimitKey = `${ip}:${phone}`
  if (!checkRateLimit(rateLimitKey)) {
    return NextResponse.json(
      { message: 'Too many attempts. Please wait 15 minutes before trying again.' },
      { status: 429 }
    )
  }

  // Validate the school
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('id, name, is_active')
    .eq('slug', school_slug)
    .single()

  if (!school || !school.is_active) {
    return NextResponse.json({ message: 'School not found or inactive' }, { status: 404 })
  }

  // Normalise phone variants for matching
  const variants: string[] = [phone]
  if (phone.startsWith('234')) {
    variants.push('0' + phone.slice(3))
    variants.push('+' + phone)
  } else if (phone.startsWith('0')) {
    variants.push('234' + phone.slice(1))
    variants.push('+234' + phone.slice(1))
  } else if (phone.startsWith('+234')) {
    variants.push('0' + phone.slice(4))
    variants.push(phone.slice(1)) // without +
  }

  const { data: students } = await supabaseAdmin
    .from('students')
    .select('id, full_name, class, parent_name, parent_phone')
    .eq('school_id', school.id)
    .eq('is_active', true)
    .in('parent_phone', variants)

  if (!students || students.length === 0) {
    // Consistent response time to prevent timing attacks
    await new Promise(r => setTimeout(r, 300))
    return NextResponse.json(
      { message: 'No student found with this phone number at this school. Contact your school admin.' },
      { status: 404 }
    )
  }

  const token = await new SignJWT({
    phone,
    school_id: school.id,
    school_slug,
    student_ids: students.map(s => s.id),
    role: 'parent',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(PARENT_JWT_SECRET)

  return NextResponse.json({
    success: true,
    token,
    students: students.map(s => ({ id: s.id, name: s.full_name, class: s.class })),
    school_name: school.name,
  })
}