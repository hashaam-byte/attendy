import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react'

export default async function TeacherAttendancePage({
  params,
}: {
  params: Promise<{ school_slug: string }>
}) {
  const { school_slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('school_id')
    .eq('user_id', user!.id)
    .single()

  // Get teacher's assigned classes
  const { data: myClasses } = await supabase
    .from('teacher_classes')
    .select('class_name')
    .eq('teacher_id', user!.id)

  const classNames = myClasses?.map(c => c.class_name) ?? []

  const today = format(new Date(), 'yyyy-MM-dd')

  // Get today's attendance for teacher's classes
  let query = supabase
    .from('attendance_logs')
    .select(`
      id, scan_type, scanned_at, is_late, late_reason, scanned_by_name,
      students (full_name, class)
    `)
    .eq('school_id', profile!.school_id)
    .eq('scan_type', 'entry')
    .gte('scanned_at', `${today}T00:00:00`)
    .order('scanned_at', { ascending: false })

  const { data: logs } = await query

  // Filter by teacher's classes if assigned
  const filtered = classNames.length > 0
    ? logs?.filter((l: any) => classNames.includes(l.students?.class))
    : logs

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/${school_slug}/teacher/scan`} className="text-gray-400">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-white text-xl font-bold">Today's Attendance</h1>
            <p className="text-gray-400 text-sm">{format(new Date(), 'EEEE, MMM d')}</p>
          </div>
        </div>

        <div className="space-y-3">
          {filtered && filtered.length > 0 ? filtered.map((log: any) => (
            <div key={log.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-3">
              {log.is_late
                ? <Clock size={18} className="text-yellow-400 shrink-0" />
                : <CheckCircle size={18} className="text-green-400 shrink-0" />
              }
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{log.students?.full_name}</p>
                <p className="text-gray-500 text-xs">
                  {log.students?.class} · {format(new Date(log.scanned_at), 'h:mm a')}
                </p>
                {log.is_late && log.late_reason && (
                  <p className="text-yellow-400/70 text-xs mt-0.5">"{log.late_reason}"</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                log.is_late ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'
              }`}>
                {log.is_late ? 'Late' : 'On Time'}
              </span>
            </div>
          )) : (
            <p className="text-gray-500 text-center py-12">No scans yet today</p>
          )}
        </div>
      </div>
    </div>
  )
}