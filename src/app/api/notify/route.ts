import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { studentId, isLate, reason, time, attendanceId } = await req.json()

  if (!studentId) {
    return NextResponse.json({ error: 'studentId required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get student + parent phone — scoped via RLS, no extra school filter needed
  // but we fetch school_id explicitly for the settings lookup
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('full_name, parent_phone, class, school_id')
    .eq('id', studentId)
    .single()

  if (studentError || !student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  // Check SMS enabled for this school
  const { data: settings } = await supabase
    .from('school_settings')
    .select('sms_enabled, whatsapp_enabled')
    .eq('school_id', student.school_id)
    .single()

  if (!settings?.sms_enabled) {
    return NextResponse.json({ skipped: true, reason: 'sms_disabled' })
  }

  // Build message
  const message = isLate
    ? `Attendy: ${student.full_name} (${student.class}) arrived LATE at ${time}.${reason ? ` Reason: ${reason}` : ''}`
    : `Attendy: ${student.full_name} (${student.class}) arrived safely at school at ${time}.`

  // Format phone: 08012345678 → 2348012345678
  let phone = student.parent_phone.replace(/\s/g, '')
  if (phone.startsWith('0')) {
    phone = '234' + phone.slice(1)
  } else if (phone.startsWith('+')) {
    phone = phone.slice(1)
  }

  let status: 'sent' | 'failed' = 'sent'
  let errorMessage: string | null = null

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
  // attendance_id is nullable in the schema (FK with ON DELETE CASCADE)
  // so we include it when provided, omit when not — no FK violation
  const logEntry: Record<string, any> = {
    school_id: student.school_id,
    student_id: studentId,
    channel: 'sms',
    phone: student.parent_phone,
    message,
    status,
    error_message: errorMessage,
  }

  // Only include attendance_id if it was passed and is a valid UUID
  if (attendanceId && typeof attendanceId === 'string' && attendanceId.length > 0) {
    logEntry.attendance_id = attendanceId
  }

  await supabase.from('notifications_log').insert(logEntry)

  return NextResponse.json({ success: status === 'sent', status })
}
