import { requireHeadAdmin } from '@/lib/head-admin/auth'
import HeadAdminNav from '../HeadAdminNav'
import { createClient } from '@supabase/supabase-js'
import { School, Users, CreditCard, AlertTriangle } from 'lucide-react'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function HeadAdminDashboard() {
  const admin = await requireHeadAdmin()

  const [schoolsRes, studentsRes, activeRes, expiredRes] = await Promise.all([
    supabaseAdmin.from('schools').select('id', { count: 'exact' }),
    supabaseAdmin.from('students').select('id', { count: 'exact' }),
    supabaseAdmin.from('schools').select('id', { count: 'exact' }).eq('is_active', true),
    supabaseAdmin.from('schools').select('id', { count: 'exact' })
      .eq('is_active', true)
      .lt('plan_expires_at', new Date().toISOString()),
  ])

  const stats = [
    { label: 'Total Schools', value: schoolsRes.count ?? 0, icon: School, color: 'purple' },
    { label: 'Active Schools', value: activeRes.count ?? 0, icon: School, color: 'green' },
    { label: 'Total Students', value: studentsRes.count ?? 0, icon: Users, color: 'blue' },
    { label: 'Expired Plans', value: expiredRes.count ?? 0, icon: AlertTriangle, color: 'red' },
  ]

  // Recent schools
  const { data: recentSchools } = await supabaseAdmin
    .from('schools')
    .select('id, name, slug, plan, is_active, plan_expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(8)

  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500/10 text-purple-400',
    green: 'bg-green-500/10 text-green-400',
    blue: 'bg-blue-500/10 text-blue-400',
    red: 'bg-red-500/10 text-red-400',
  }

  const planColors: Record<string, string> = {
    free: 'bg-gray-500/10 text-gray-400',
    basic: 'bg-blue-500/10 text-blue-400',
    standard: 'bg-green-500/10 text-green-400',
    pro: 'bg-purple-500/10 text-purple-400',
  }

  return (
    <div className="flex">
      <HeadAdminNav adminName={admin.email} />
      <main className="flex-1 ml-0 md:ml-60 p-8">
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold">Head Admin Dashboard</h1>
          <p className="text-gray-400 text-sm">Platform-wide overview</p>
        </div>

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

        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-white font-semibold">Recent Schools</h2>
            <a href="/head-admin/schools" className="text-purple-400 text-xs hover:text-purple-300">
              View all →
            </a>
          </div>
          <div className="divide-y divide-gray-800">
            {recentSchools?.map((school: any) => (
              <div key={school.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{school.name}</p>
                  <p className="text-gray-500 text-xs font-mono">/{school.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${planColors[school.plan] ?? planColors.free}`}>
                    {school.plan}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${school.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {school.is_active ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}