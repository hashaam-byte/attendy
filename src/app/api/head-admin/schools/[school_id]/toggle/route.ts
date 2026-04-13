import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getHeadAdminSession } from '@/lib/head-admin/auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ school_id: string }> }
) {
  const session = await getHeadAdminSession()
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { school_id } = await params
  const { is_active } = await req.json()

  const { error } = await supabaseAdmin
    .from('schools')
    .update({ is_active })
    .eq('id', school_id)

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  await supabaseAdmin.from('subscription_logs').insert({
    school_id,
    action: is_active ? 'activated' : 'suspended',
    note: `Manually ${is_active ? 'activated' : 'suspended'} by head admin`,
    performed_by: session.email,
  })

  return NextResponse.json({ success: true })
}