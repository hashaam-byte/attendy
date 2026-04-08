import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { Users, UserCheck, UserX, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [studentsRes, presentRes, lateRes] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact' }).eq('is_active', true),
    supabase.from('attendance_logs')
      .select('id', { count: 'exact' })
      .eq('scan_type', 'entry')
      .gte('scanned_at', `${today}T00:00:00`)
      .lte('scanned_at', `${today}T23:59:59`),
    supabase.from('attendance_logs')
      .select('id', { count: 'exact' })
      .eq('scan_type', 'entry')
      .eq('is_late', true)
      .gte('scanned_at', `${today}T00:00:00`)
      .lte('scanned_at', `${today}T23:59:59`),
  ])

  const totalStudents = studentsRes.count ?? 0
  const presentToday = presentRes.count ?? 0
  const lateToday = lateRes.count ?? 0
  const absentToday = totalStudents - presentToday

  const stats = [
    { label: 'Total Students', value: totalStudents, icon: Users, color: 'blue' },
    { label: 'Present Today', value: presentToday, icon: UserCheck, color: 'green' },
    { label: 'Absent Today', value: absentToday, icon: UserX, color: 'red' },
    { label: 'Late Today', value: lateToday, icon: Clock, color: 'yellow' },
  ]

  // Recent attendance logs
  const { data: recentLogs } = await supabase
    .from('attendance_logs')
    .select(`
      id, scan_type, scanned_at, is_late, scanned_by_name,
      students (full_name, class)
    `)
    .gte('scanned_at', `${today}T00:00:00`)
    .order('scanned_at', { ascending: false })
    .limit(10)

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    red: 'bg-red-500/10 text-red-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400 text-sm">{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-gray-400 text-sm">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Today's Activity</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {recentLogs && recentLogs.length > 0 ? recentLogs.map((log: any) => (
            <div key={log.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{log.students?.full_name}</p>
                <p className="text-gray-500 text-xs">{log.students?.class} · Scanned by {log.scanned_by_name}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  log.is_late ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'
                }`}>
                  {log.is_late ? 'Late' : 'On Time'}
                </span>
                <p className="text-gray-500 text-xs mt-1">
                  {format(new Date(log.scanned_at), 'h:mm a')}
                </p>
              </div>
            </div>
          )) : (
            <p className="text-gray-500 text-sm p-6 text-center">No scans yet today</p>
          )}
        </div>
      </div>
    </div>
  )
}