import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { studentId, isLate, reason, time } = await req.json()
  const supabase = await createClient()

  // Get student + parent phone
  const { data: student } = await supabase
    .from('students')
    .select('full_name, parent_phone, class, school_id')
    .eq('id', studentId)
    .single()

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Check if SMS is enabled for this school
  const { data: settings } = await supabase
    .from('school_settings')
    .select('sms_enabled')
    .eq('school_id', student.school_id)
    .single()

  if (!settings?.sms_enabled) {
    return NextResponse.json({ skipped: true })
  }

  // Build message
  const message = isLate
    ? `Attendy: ${student.full_name} (${student.class}) arrived LATE at ${time}.${reason ? ` Reason: ${reason}` : ''}`
    : `Attendy: ${student.full_name} (${student.class}) arrived safely at school at ${time}.`

  // Format phone: convert 08012345678 → 2348012345678
  let phone = student.parent_phone.replace(/\s/g, '')
  if (phone.startsWith('0')) {
    phone = '234' + phone.slice(1)
  } else if (phone.startsWith('+')) {
    phone = phone.slice(1)
  }

  // Send via Termii
  let status = 'sent'
  let errorMessage = null

  try {
    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phone,
        from: process.env.TERMII_SENDER_ID ?? 'Attendy',
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: process.env.TERMII_API_KEY,
      }),
    })

    const data = await res.json()
    if (!res.ok || data.code !== 'ok') {
      status = 'failed'
      errorMessage = JSON.stringify(data)
    }
  } catch (err) {
    status = 'failed'
    errorMessage = String(err)
  }

  // Log the notification
  await supabase.from('notifications_log').insert({
    school_id: student.school_id,
    student_id: studentId,
    channel: 'sms',
    phone: student.parent_phone,
    message,
    status,
    error_message: errorMessage,
  })

  return NextResponse.json({ success: status === 'sent' })
}