import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { CheckCircle, Clock, XCircle } from 'lucide-react'

export default async function MyChildPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get linked children
  const { data: links } = await supabase
    .from('parent_students')
    .select('student_id, students(*)')
    .eq('parent_user_id', user!.id)

  // Get attendance for all linked children
  const studentIds = links?.map(l => l.student_id) ?? []

  const { data: logs } = await supabase
    .from('attendance_logs')
    .select(`
      id, scan_type, scanned_at, is_late, late_reason, scanned_by_name,
      students(full_name, class)
    `)
    .in('student_id', studentIds)
    .eq('scan_type', 'entry')
    .order('scanned_at', { ascending: false })
    .limit(30)

  return (
    <div className="min-h-screen bg-gray-950 p-4 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">My Child's Attendance</h1>
        <p className="text-gray-400 text-sm">Last 30 records</p>
      </div>

      {/* Children list */}
      {links?.map((link: any) => (
        <div key={link.student_id} className="bg-green-600/10 border border-green-600/20 rounded-xl p-4 mb-4">
          <p className="text-white font-semibold">{link.students.full_name}</p>
          <p className="text-green-400 text-sm">{link.students.class}</p>
        </div>
      ))}

      {/* Attendance records */}
      <div className="space-y-3">
        {logs && logs.length > 0 ? logs.map((log: any) => (
          <div key={log.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-start gap-3">
            {log.is_late ? (
              <Clock size={20} className="text-yellow-400 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle size={20} className="text-green-400 mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-medium">
                  {log.students?.full_name}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  log.is_late
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-green-500/10 text-green-400'
                }`}>
                  {log.is_late ? 'Late' : 'On Time'}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                {format(new Date(log.scanned_at), 'EEEE, MMM d · h:mm a')}
              </p>
              {log.is_late && log.late_reason && (
                <p className="text-yellow-400/70 text-xs mt-1">Reason: {log.late_reason}</p>
              )}
            </div>
          </div>
        )) : (
          <p className="text-gray-500 text-center py-8">No attendance records yet</p>
        )}
      </div>
    </div>
  )
}