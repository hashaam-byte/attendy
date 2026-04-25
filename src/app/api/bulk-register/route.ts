import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TERMII_BASE_URL = 'https://api.ng.termii.com'

interface StudentRow {
  full_name: string
  class: string
  parent_name?: string
  parent_phone: string
}

async function sendRegistrationSMS(
  phone: string,
  studentName: string,
  studentClass: string,
  schoolName: string,
  schoolSlug: string
): Promise<void> {
  const apiKey = process.env.TERMII_API_KEY
  const senderId = process.env.TERMII_SENDER_ID ?? 'Attendy'

  if (!apiKey) {
    console.log('[SMS DEV] Bulk registration SMS would send to:', phone)
    return
  }

  let to = phone.replace(/[\s\-().+]/g, '')
  if (to.startsWith('0') && to.length === 11) to = '234' + to.slice(1)
  else if (to.startsWith('+')) to = to.slice(1)

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://attendy-edu.vercel.app'
  const message =
    `Attendy: ${studentName} (${studentClass}) registered at ${schoolName}. ` +
    `SMS alerts sent on every gate scan. Parent portal: ${baseUrl}/${schoolSlug}/parent/login`

  const clean = message.replace(/[;/^{}\\[\]~|€'"]/g, '').slice(0, 160)
  const payload = { api_key: apiKey, to, from: senderId, sms: clean, type: 'plain', channel: 'dnd' }

  try {
    const res = await fetch(`${TERMII_BASE_URL}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (res.ok && data.code === 'ok') return

    // fallback generic
    await fetch(`${TERMII_BASE_URL}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, channel: 'generic' }),
    })
  } catch {
    // SMS failure must never fail the import
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { students, school_id } = await req.json()

  if (!school_id || !Array.isArray(students) || students.length === 0) {
    return NextResponse.json({ message: 'school_id and students array required' }, { status: 400 })
  }

  if (students.length > 500) {
    return NextResponse.json({ message: 'Maximum 500 students per bulk import' }, { status: 400 })
  }

  const { data: callerProfile } = await supabase
    .from('user_profiles')
    .select('school_id, role')
    .eq('user_id', user.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin' || callerProfile.school_id !== school_id) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('max_students, name, slug')
    .eq('id', school_id)
    .single()

  const { count: currentCount } = await supabaseAdmin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', school_id)
    .eq('is_active', true)

  if (school && ((currentCount ?? 0) + students.length) > school.max_students) {
    return NextResponse.json({
      message: `Adding ${students.length} students would exceed your plan limit of ${school.max_students}. Currently have ${currentCount ?? 0}.`
    }, { status: 403 })
  }

  const errors: string[] = []
  const phoneRegex = /^(0|\+?234)[789][01]\d{8}$/

  students.forEach((s: StudentRow, i: number) => {
    if (!s.full_name?.trim()) errors.push(`Row ${i + 1}: full_name is required`)
    if (!s.class?.trim()) errors.push(`Row ${i + 1}: class is required`)
    if (!s.parent_phone?.trim()) errors.push(`Row ${i + 1}: parent_phone is required`)
    else if (!phoneRegex.test(s.parent_phone.replace(/\s/g, ''))) {
      errors.push(`Row ${i + 1}: invalid phone "${s.parent_phone}"`)
    }
  })

  if (errors.length > 0) {
    return NextResponse.json({ message: 'Validation errors', errors }, { status: 422 })
  }

  const rows = students.map((s: StudentRow) => ({
    school_id,
    full_name: s.full_name.trim(),
    class: s.class.trim(),
    parent_name: s.parent_name?.trim() || null,
    parent_phone: s.parent_phone.trim(),
  }))

  const { data: inserted, error } = await supabaseAdmin
    .from('students')
    .insert(rows)
    .select('id, full_name, class, qr_code, parent_phone')

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  // Check SMS settings once
  const { data: settings } = await supabaseAdmin
    .from('school_settings')
    .select('sms_enabled')
    .eq('school_id', school_id)
    .single()

  // Send registration SMS to each parent (fire-and-forget, non-blocking)
  if (settings?.sms_enabled && inserted && school) {
    Promise.allSettled(
      inserted.map(s =>
        sendRegistrationSMS(
          s.parent_phone,
          s.full_name,
          s.class,
          school.name,
          school.slug
        )
      )
    ).catch(() => {})
  }

  return NextResponse.json({ success: true, count: inserted?.length ?? 0, students: inserted })
}
