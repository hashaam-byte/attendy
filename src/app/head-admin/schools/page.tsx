import { requireHeadAdmin } from '@/lib/head-admin/auth'
import HeadAdminNav from '../HeadAdminNav'
import SchoolsClient from './ShcoolsClientt'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function SchoolsPage() {
  const admin = await requireHeadAdmin()

  const { data: schools } = await supabaseAdmin
    .from('schools')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex">
      <HeadAdminNav adminName={admin.email} />
      <main className="flex-1 ml-0 md:ml-60 p-8">
        <SchoolsClient schools={schools ?? []} />
      </main>
    </div>
  )
}