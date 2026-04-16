import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  // Get admin profile + school
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const schoolId = profile.school_id
  const url = new URL(req.url)
  const dateFrom = url.searchParams.get('from') // yyyy-MM-dd
  const dateTo = url.searchParams.get('to')     // yyyy-MM-dd
  const classFilter = url.searchParams.get('class') ?? ''

  let query = supabase
    .from('attendance_logs')
    .select(`
      id, scan_type, scanned_at, is_late, late_reason, scanned_by_name,
      students (full_name, class, parent_phone)
    `)
    .eq('school_id', schoolId)
    .eq('scan_type', 'entry')
    .order('scanned_at', { ascending: false })
    .limit(5000)

  if (dateFrom) query = query.gte('scanned_at', `${dateFrom}T00:00:00`)
  if (dateTo) query = query.lte('scanned_at', `${dateTo}T23:59:59`)

  const { data: logs, error } = await query

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  const filtered = classFilter
    ? (logs ?? []).filter((l: any) => l.students?.class === classFilter)
    : (logs ?? [])

  // Build CSV
  const csvRows = [
    ['Date', 'Time', 'Student Name', 'Class', 'Status', 'Late Reason', 'Scanned By', 'Parent Phone'],
    ...filtered.map((l: any) => [
      format(new Date(l.scanned_at), 'yyyy-MM-dd'),
      format(new Date(l.scanned_at), 'HH:mm'),
      l.students?.full_name ?? '',
      l.students?.class ?? '',
      l.is_late ? 'LATE' : 'ON TIME',
      l.late_reason ?? '',
      l.scanned_by_name ?? '',
      l.students?.parent_phone ?? '',
    ])
  ]

  const csv = csvRows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',')
  ).join('\r\n')

  const filename = `attendance_${dateFrom ?? 'all'}_to_${dateTo ?? 'all'}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}