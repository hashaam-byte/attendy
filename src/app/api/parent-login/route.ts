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

export async function POST(req: NextRequest) {
  const { phone, school_slug } = await req.json()

  if (!phone || !school_slug) {
    return NextResponse.json({ message: 'Phone number and school required' }, { status: 400 })
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
  // Parent phone in DB could be stored as 0812... or 234812... or +234812...
  const variants: string[] = [phone]
  if (phone.startsWith('234')) {
    variants.push('0' + phone.slice(3))   // 234812... → 0812...
    variants.push('+' + phone)             // 234812... → +234812...
  } else if (phone.startsWith('0')) {
    variants.push('234' + phone.slice(1)) // 0812... → 234812...
  }

  // Find students linked to this phone number in this school
  const { data: students } = await supabaseAdmin
    .from('students')
    .select('id, full_name, class, parent_name, parent_phone')
    .eq('school_id', school.id)
    .eq('is_active', true)
    .in('parent_phone', variants)

  if (!students || students.length === 0) {
    return NextResponse.json(
      { message: 'No student found with this phone number at this school. Contact your school admin.' },
      { status: 404 }
    )
  }

  // Issue a lightweight JWT (no Supabase auth needed for parents)
  const token = await new SignJWT({
    phone,
    school_id: school.id,
    school_slug,
    student_ids: students.map(s => s.id),
    role: 'parent',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // parents stay logged in for 30 days
    .sign(PARENT_JWT_SECRET)

  return NextResponse.json({
    success: true,
    token,
    students: students.map(s => ({ id: s.id, name: s.full_name, class: s.class })),
    school_name: school.name,
  })
}