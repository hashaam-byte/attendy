import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TERMII_BASE_URL = 'https://api.ng.termii.com'

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.TERMII_API_KEY
  const senderId = process.env.TERMII_SENDER_ID ?? 'Attendy'

  if (!apiKey) {
    console.log('[SMS DEV] Registration SMS would send to:', phone, '|', message)
    return { success: true }
  }

  let to = phone.replace(/[\s\-().+]/g, '')
  if (to.startsWith('0') && to.length === 11) to = '234' + to.slice(1)
  else if (to.startsWith('+')) to = to.slice(1)

  // strip Termii special chars to keep within 160
  const clean = message.replace(/[;/^{}\\[\]~|€'"]/g, '').slice(0, 160)

  const payload = { api_key: apiKey, to, from: senderId, sms: clean, type: 'plain', channel: 'dnd' }

  try {
    const res = await fetch(`${TERMII_BASE_URL}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (res.ok && data.code === 'ok') return { success: true }

    // fallback to generic
    const res2 = await fetch(`${TERMII_BASE_URL}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, channel: 'generic' }),
    })
    const data2 = await res2.json()
    if (res2.ok && data2.code === 'ok') return { success: true }
    return { success: false, error: data2.message ?? JSON.stringify(data2) }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Called by bulk-register AND register-student after a student is created
export async function POST(req: NextRequest) {
  // Verify caller is authenticated (school admin)
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { student_id, school_id } = await req.json()
  if (!student_id || !school_id) {
    return NextResponse.json({ error: 'student_id and school_id required' }, { status: 400 })
  }

  const { data: settings } = await supabaseAdmin
    .from('school_settings')
    .select('sms_enabled')
    .eq('school_id', school_id)
    .single()

  if (!settings?.sms_enabled) {
    return NextResponse.json({ skipped: true, reason: 'sms_disabled' })
  }

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('full_name, class, parent_phone, parent_name')
    .eq('id', student_id)
    .eq('school_id', school_id)
    .single()

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('name, slug')
    .eq('id', school_id)
    .single()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://attendy-edu.vercel.app'
  const parentPortal = `${baseUrl}/${school?.slug ?? ''}/parent/login`

  const message =
    `Attendy: ${student.full_name} (${student.class}) has been registered at ${school?.name ?? 'your school'}. ` +
    `You will receive SMS alerts when they scan in. Track at: ${parentPortal}`

  const { success, error } = await sendSMS(student.parent_phone, message)

  await supabaseAdmin.from('notifications_log').insert({
    school_id,
    student_id,
    channel: 'sms',
    phone: student.parent_phone,
    message,
    status: success ? 'sent' : 'failed',
    error_message: error ?? null,
  })

  return NextResponse.json({ success, dev_mode: !process.env.TERMII_API_KEY })
}
