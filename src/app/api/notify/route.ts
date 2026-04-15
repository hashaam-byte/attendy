import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // Get school slug so we can include portal link
  const { data: school } = await supabase
    .from('schools')
    .select('slug')
    .eq('id', student.school_id)
    .single()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://attendy-edu.vercel.app'
  const portalLink = school?.slug ? `${baseUrl}/${school.slug}/parent/login` : null

  // Build message — keep under 160 chars for 1 SMS unit
  let message: string
  if (isLate) {
    message = `Attendy: ${student.full_name} arrived LATE at ${time}.${reason ? ` Reason: ${reason}.` : ''}`
  } else {
    message = `Attendy: ${student.full_name} (${student.class}) arrived safely at ${time}.`
  }

  // Append portal link if message is short enough
  if (portalLink && (message.length + portalLink.length + 15) <= 160) {
    message += ` Track: ${portalLink}`
  } else if (portalLink) {
    // Send as second SMS or just truncate — we choose to keep the link
    message = message.length > 130 ? message.slice(0, 127) + '...' : message
    message += `\n${portalLink}`
  }

  // Format phone: 08012345678 → 2348012345678
  let phone = student.parent_phone.replace(/\s/g, '')
  if (phone.startsWith('0')) {
    phone = '234' + phone.slice(1)
  } else if (phone.startsWith('+')) {
    phone = phone.slice(1)
  }

  let status: 'sent' | 'failed' = 'sent'
  let errorMessage: string | null = null

  // Only attempt to send if API key is configured
  if (process.env.TERMII_API_KEY) {
    try {
      const res = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phone,
          from: process.env.TERMII_SENDER_ID ?? 'Attendy',
          sms: message,
          type: 'plain',
          channel: 'dnd',   // Use DND channel to reach all Nigerian networks including DND numbers
          api_key: process.env.TERMII_API_KEY,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.code !== 'ok') {
        // Fallback to generic channel
        const res2 = await fetch('https://api.ng.termii.com/api/sms/send', {
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
        const data2 = await res2.json()
        if (!res2.ok || data2.code !== 'ok') {
          status = 'failed'
          errorMessage = JSON.stringify(data2)
        }
      }
    } catch (err) {
      status = 'failed'
      errorMessage = String(err)
    }
  } else {
    // Development mode: log to console instead of sending
    console.log('[DEV — SMS not sent, no TERMII_API_KEY]', { to: phone, message })
    status = 'sent' // mark as sent in dev so logs don't fill up with errors
    errorMessage = 'DEV_MODE: Termii API key not configured — message logged to console only'
  }

  const logEntry: Record<string, any> = {
    school_id: student.school_id,
    student_id: studentId,
    channel: 'sms',
    phone: student.parent_phone,
    message,
    status,
    error_message: errorMessage,
  }

  if (attendanceId && typeof attendanceId === 'string' && attendanceId.length > 0) {
    logEntry.attendance_id = attendanceId
  }

  await supabase.from('notifications_log').insert(logEntry)

  return NextResponse.json({ success: status === 'sent', status, dev_mode: !process.env.TERMII_API_KEY })
}