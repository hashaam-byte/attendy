import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Normalise any phone format to E.164 without leading +
// Handles: 0812..., 234812..., +234812..., 44123..., etc.
function normalisePhone(raw: string): string {
  let p = raw.replace(/[\s\-().+]/g, '')

  // Nigerian local format: 0XXXXXXXXXX (11 digits)
  if (p.startsWith('0') && p.length === 11) {
    return '234' + p.slice(1)
  }
  // Already has country code without +
  if (p.length >= 10 && !p.startsWith('0')) {
    return p
  }
  return p
}

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
    .select('sms_enabled, whatsapp_enabled')
    .eq('school_id', student.school_id)
    .single()

  if (!settings?.sms_enabled) {
    return NextResponse.json({ skipped: true, reason: 'sms_disabled' })
  }

  // Get school info for the portal link
  const { data: school } = await supabase
    .from('schools')
    .select('slug, name')
    .eq('id', student.school_id)
    .single()

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://attendy-edu.vercel.app'

  // Build a clean message — avoid special characters to stay within 160-char SMS budget
  // Special chars reduce limit from 160 to 70 chars per page — avoid emoji in SMS
  let message: string
  if (isLate) {
    message = `Attendy Alert: ${student.full_name} (${student.class}) arrived LATE at ${time}.`
    if (reason) {
      // Truncate reason if too long
      const reasonText = reason.slice(0, 40)
      message += ` Reason: ${reasonText}.`
    }
  } else {
    message = `Attendy: ${student.full_name} (${student.class}) arrived safely at ${time}. All good!`
  }

  // Keep message under 160 chars to avoid multi-part SMS charges
  if (message.length > 155) {
    message = message.slice(0, 152) + '...'
  }

  // Normalise the parent's phone number
  const phone = normalisePhone(student.parent_phone)

  let status: 'sent' | 'failed' | 'dev_mode' = 'sent'
  let errorMessage: string | null = null
  let termiiResponse: any = null

  const apiKey = process.env.TERMII_API_KEY
  const senderId = process.env.TERMII_SENDER_ID ?? 'Attendy'

  if (!apiKey) {
    // Development mode — log instead of sending
    console.log('[SMS DEV MODE] Would send to:', phone)
    console.log('[SMS DEV MODE] Message:', message)
    status = 'dev_mode'
    errorMessage = 'TERMII_API_KEY not set — message logged to console only'
  } else {
    // Try DND channel first (recommended for transactional messages in Nigeria)
    // DND channel reaches all networks including DND-registered numbers
    const channels = ['dnd', 'generic'] as const

    for (const channel of channels) {
      try {
        const res = await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phone,
            from: senderId,
            sms: message,
            type: 'plain',
            channel,
            api_key: apiKey,
          }),
        })

        const data = await res.json()
        termiiResponse = data

        if (res.ok && data.code === 'ok') {
          status = 'sent'
          console.log(`[SMS] Sent via ${channel} channel, message_id: ${data.message_id}`)
          break
        } else {
          console.warn(`[SMS] Channel ${channel} failed:`, data)
          status = 'failed'
          errorMessage = JSON.stringify(data)
        }
      } catch (err) {
        console.error(`[SMS] Network error on channel ${channel}:`, err)
        status = 'failed'
        errorMessage = String(err)
      }
    }
  }

  // Log the notification attempt to DB
  const logEntry: Record<string, any> = {
    school_id: student.school_id,
    student_id: studentId,
    channel: 'sms',
    phone: student.parent_phone,
    message,
    status: status === 'dev_mode' ? 'sent' : status,
    error_message: errorMessage,
  }

  if (attendanceId && typeof attendanceId === 'string' && attendanceId.length > 0) {
    logEntry.attendance_id = attendanceId
  }

  await supabase.from('notifications_log').insert(logEntry)

  return NextResponse.json({
    success: status === 'sent' || status === 'dev_mode',
    status,
    dev_mode: !apiKey,
    phone_normalised: phone,
    message_length: message.length,
    termii_response: termiiResponse,
  })
}