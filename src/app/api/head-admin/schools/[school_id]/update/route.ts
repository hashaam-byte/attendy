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
  const { plan, plan_expires_at, is_active, max_students, max_teachers, max_parents } = await req.json()

  const { data: old } = await supabaseAdmin
    .from('schools')
    .select('plan, is_active')
    .eq('id', school_id)
    .single()

  const { error } = await supabaseAdmin
    .from('schools')
    .update({
      plan,
      plan_expires_at: plan_expires_at || null,
      is_active,
      max_students,
      max_teachers,
      max_parents,
    })
    .eq('id', school_id)

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  // Log changes
  const actions = []
  if (old?.plan !== plan) actions.push(`plan_changed: ${old?.plan} → ${plan}`)
  if (old?.is_active !== is_active) actions.push(is_active ? 'activated' : 'suspended')

  for (const action of actions) {
    await supabaseAdmin.from('subscription_logs').insert({
      school_id,
      action: action.split(':')[0],
      old_plan: old?.plan,
      new_plan: plan,
      note: action,
      performed_by: session.email,
    })
  }

  return NextResponse.json({ success: true })
}