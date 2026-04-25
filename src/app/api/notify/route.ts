import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TERMII_BASE_URL = 'https://api.ng.termii.com'

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.TERMII_API_KEY
  const senderId = process.env.TERMII_SENDER_ID ?? 'Attendy'

  if (!apiKey) {
    // Dev mode – log and pretend success so app flow continues
    console.log('[SMS DEV MODE] Would send to:', phone, '| Message:', message)
    return { success: true }
  }

  // Normalise phone: always international format (234XXXXXXXXXX)
  let to = phone.replace(/[\s\-().+]/g, '')
  if (to.startsWith('0') && to.length === 11) to = '234' + to.slice(1)
  else if (to.startsWith('+')) to = to.slice(1)

  // Keep message under 160 chars for single SMS unit (avoid special chars inflating cost)
  const cleanMessage = message
    .replace(/[;/^{}\\[\]~|€'"]/g, '') // strip special chars that reduce char count to 70
    .slice(0, 160)

  const payload = {
    api_key: apiKey,
    to,
    from: senderId,
    sms: cleanMessage,
    type: 'plain',
    // ALWAYS use dnd for transactional/attendance messages per Termii docs.
    // DND bypasses Do-Not-Disturb restrictions and has no MTN night-time block.
    channel: 'dnd',
  }

  try {
    const res = await fetch(`${TERMII_BASE_URL}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (res.ok && data.code === 'ok') return { success: true }

    // DND failed – fallback to generic (covers edge cases like sandbox/test accounts)
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

// ── POST /api/notify  (called after every scan) ──────────────────────────────
export async function POST(req: NextRequest) {
  const { studentId, isLate, reason, time, attendanceId } = await req.json()

  if (!studentId) {
    return NextResponse.json({ error: 'studentId required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('full_name, parent_phone, class, school_id')
    .eq('id', studentId)
    .single()

  if (studentError || !student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const { data: settings } = await supabase
    .from('school_settings')
    .select('sms_enabled')
    .eq('school_id', student.school_id)
    .single()

  if (!settings?.sms_enabled) {
    return NextResponse.json({ skipped: true, reason: 'sms_disabled' })
  }

  // Build compact message (stay under 160 chars)
  let message: string
  if (isLate) {
    message = `Attendy: ${student.full_name} arrived LATE at ${time}.${reason ? ` Reason: ${reason}.` : ''}`
  } else {
    message = `Attendy: ${student.full_name} (${student.class}) arrived safely at ${time}.`
  }

  const { success, error: smsError } = await sendSMS(student.parent_phone, message)

  // Log result
  const logEntry: Record<string, any> = {
    school_id: student.school_id,
    student_id: studentId,
    channel: 'sms',
    phone: student.parent_phone,
    message,
    status: success ? 'sent' : 'failed',
    error_message: smsError ?? null,
  }
  if (attendanceId) logEntry.attendance_id = attendanceId

  await supabase.from('notifications_log').insert(logEntry)

  return NextResponse.json({ success, dev_mode: !process.env.TERMII_API_KEY })
}
