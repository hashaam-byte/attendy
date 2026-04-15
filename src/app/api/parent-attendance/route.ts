import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PARENT_JWT_SECRET = new TextEncoder().encode(
  process.env.PARENT_JWT_SECRET ?? 'parent-jwt-secret-attendy-change-in-prod-32chars!!'
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)

  let payload: any
  try {
    const result = await jwtVerify(token, PARENT_JWT_SECRET)
    payload = result.payload
  } catch {
    return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 })
  }

  const { school_id, student_ids } = payload

  if (!school_id || !student_ids?.length) {
    return NextResponse.json({ error: 'Invalid session data' }, { status: 400 })
  }

  // Get school info
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('name')
    .eq('id', school_id)
    .single()

  // Get student details
  const { data: students } = await supabaseAdmin
    .from('students')
    .select('id, full_name, class, parent_name')
    .in('id', student_ids)
    .eq('school_id', school_id)
    .eq('is_active', true)

  // Get attendance logs for these students (last 60 days)
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const { data: logs } = await supabaseAdmin
    .from('attendance_logs')
    .select(`
      id, scan_type, scanned_at, is_late, late_reason, scanned_by_name,
      students (full_name, class)
    `)
    .in('student_id', student_ids)
    .eq('school_id', school_id)
    .eq('scan_type', 'entry')
    .gte('scanned_at', sixtyDaysAgo.toISOString())
    .order('scanned_at', { ascending: false })
    .limit(100)

  return NextResponse.json({
    students: students ?? [],
    logs: logs ?? [],
    school_name: school?.name ?? '',
  })
}