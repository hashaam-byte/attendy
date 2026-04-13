import { createClient } from '@/lib/supabase/server'
import { format, subDays } from 'date-fns'
import { notFound } from 'next/navigation'

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ school_slug: string }>
}) {
  const { school_slug } = await params
  const supabase = await createClient()

  // Get school and verify it exists
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', school_slug)
    .single()

  if (!school) notFound()

  const schoolId = school.id

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return format(d, 'yyyy-MM-dd')
  })

  // CRITICAL: every query scoped to this school only
  const dailyStats = await Promise.all(
    last7Days.map(async (day) => {
      const [presentRes, lateRes] = await Promise.all([
        supabase
          .from('attendance_logs')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('scan_type', 'entry')
          .gte('scanned_at', `${day}T00:00:00`)
          .lte('scanned_at', `${day}T23:59:59`),

        supabase
          .from('attendance_logs')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('scan_type', 'entry')
          .eq('is_late', true)
          .gte('scanned_at', `${day}T00:00:00`)
          .lte('scanned_at', `${day}T23:59:59`),
      ])
      return {
        date: day,
        label: format(new Date(day + 'T12:00:00'), 'EEE'),
        present: presentRes.count ?? 0,
        late: lateRes.count ?? 0,
      }
    })
  )

  // CRITICAL: scoped to school
  const { data: recentLate } = await supabase
    .from('attendance_logs')
    .select(`
      id, scanned_at, late_reason, scanned_by_name,
      students (full_name, class)
    `)
    .eq('school_id', schoolId)
    .eq('scan_type', 'entry')
    .eq('is_late', true)
    .order('scanned_at', { ascending: false })
    .limit(10)

  const maxPresent = Math.max(...dailyStats.map(d => d.present), 1)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Reports</h1>
        <p className="text-gray-400 text-sm">Last 7 days overview</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
        <h2 className="text-white font-semibold mb-4">Daily Attendance</h2>
        <div className="flex items-end gap-2 h-32">
          {dailyStats.map(day => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end h-24 gap-0.5">
                <div
                  className="w-full bg-yellow-500/60 rounded-sm"
                  style={{ height: `${(day.late / maxPresent) * 100}%`, minHeight: day.late > 0 ? '4px' : '0' }}
                />
                <div
                  className="w-full bg-green-500/60 rounded-sm"
                  style={{ height: `${((day.present - day.late) / maxPresent) * 100}%`, minHeight: day.present > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="text-gray-500 text-xs">{day.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-3 h-3 bg-green-500/60 rounded-sm inline-block" /> On Time
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-3 h-3 bg-yellow-500/60 rounded-sm inline-block" /> Late
          </span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Recent Late Arrivals</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {recentLate && recentLate.length > 0 ? recentLate.map((log: any) => (
            <div key={log.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-medium">{log.students?.full_name}</p>
                <p className="text-gray-500 text-xs">
                  {format(new Date(log.scanned_at), 'MMM d, h:mm a')}
                </p>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">
                {log.students?.class}
                {log.late_reason && ` · "${log.late_reason}"`}
              </p>
            </div>
          )) : (
            <p className="text-gray-500 text-sm text-center py-6">No late arrivals yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
