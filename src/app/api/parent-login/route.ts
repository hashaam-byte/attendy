import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PARENT_JWT_SECRET = new TextEncoder().encode(
  process.env.PARENT_JWT_SECRET ??
    'parent-jwt-secret-attendy-change-in-prod-32chars!!'
)

// Build all possible phone variants for matching
// DB may store numbers in various formats depending on when they were added
function buildPhoneVariants(phone: string): string[] {
  // phone is already E.164 without + (e.g. 2348012345678)
  const variants = new Set<string>()
  variants.add(phone) // 2348012345678

  // Strip leading country codes to get local formats
  if (phone.startsWith('234') && phone.length === 13) {
    variants.add('0' + phone.slice(3)) // 08012345678
    variants.add('+' + phone) // +2348012345678
    variants.add(phone.slice(3)) // 8012345678
  } else if (phone.startsWith('233')) {
    // Ghana
    variants.add('0' + phone.slice(3))
    variants.add('+' + phone)
  } else if (phone.startsWith('254')) {
    // Kenya
    variants.add('0' + phone.slice(3))
    variants.add('+' + phone)
  } else {
    // Generic: add + prefix variant
    variants.add('+' + phone)
    if (phone.length > 10) {
      // Try stripping first digit (could be country code starting with 1 digit like 1, 7, etc.)
      variants.add('0' + phone.slice(1))
    }
  }

  return Array.from(variants)
}

export async function POST(req: NextRequest) {
  const { phone, school_slug } = await req.json()

  if (!phone || !school_slug) {
    return NextResponse.json(
      { message: 'Phone number and school required' },
      { status: 400 }
    )
  }

  // Validate the school
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('id, name, is_active')
    .eq('slug', school_slug)
    .single()

  if (!school || !school.is_active) {
    return NextResponse.json(
      { message: 'School not found or inactive' },
      { status: 404 }
    )
  }

  // Build all phone variants to try
  const variants = buildPhoneVariants(phone)

  // Find students linked to this phone number in this school
  const { data: students } = await supabaseAdmin
    .from('students')
    .select('id, full_name, class, parent_name, parent_phone')
    .eq('school_id', school.id)
    .eq('is_active', true)
    .in('parent_phone', variants)

  if (!students || students.length === 0) {
    return NextResponse.json(
      {
        message:
          'No student found with this phone number at this school. Contact your school admin.',
      },
      { status: 404 }
    )
  }

  // Issue a lightweight JWT (no Supabase auth needed for parents)
  const token = await new SignJWT({
    phone,
    school_id: school.id,
    school_slug,
    student_ids: students.map((s) => s.id),
    role: 'parent',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(PARENT_JWT_SECRET)

  return NextResponse.json({
    success: true,
    token,
    students: students.map((s) => ({
      id: s.id,
      name: s.full_name,
      class: s.class,
    })),
    school_name: school.name,
  })
}