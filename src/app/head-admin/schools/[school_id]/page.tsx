import { requireHeadAdmin } from '@/lib/head-admin/auth'
import HeadAdminNav from '../../HeadAdminNav'
import SchoolDetailClient from './SchoolDetailClient'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ school_id: string }>
}) {
  const { school_id } = await params
  const admin = await requireHeadAdmin()

  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('*')
    .eq('id', school_id)
    .single()

  if (!school) notFound()

  const [studentsRes, staffRes, logsRes] = await Promise.all([
    supabaseAdmin.from('students').select('id', { count: 'exact' }).eq('school_id', school_id),
    supabaseAdmin.from('user_profiles').select('id', { count: 'exact' }).eq('school_id', school_id).neq('role', 'parent'),
    supabaseAdmin.from('subscription_logs').select('*').eq('school_id', school_id).order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <div className="flex">
      <HeadAdminNav adminName={admin.email} />
      <main className="flex-1 ml-0 md:ml-60 p-8">
        <SchoolDetailClient
          school={school}
          studentCount={studentsRes.count ?? 0}
          staffCount={staffRes.count ?? 0}
          logs={logsRes.data ?? []}
        />
      </main>
    </div>
  )
}