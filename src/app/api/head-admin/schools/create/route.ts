import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getHeadAdminSession } from '@/lib/head-admin/auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Verify head admin session
  const session = await getHeadAdminSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const {
    name, slug, plan, plan_expires_at,
    admin_email, admin_name, admin_password,
    max_students, max_teachers, max_parents,
  } = await req.json()

  // Check slug isn't taken
  const { data: existing } = await supabaseAdmin
    .from('schools')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json({ message: `Slug "${slug}" is already taken` }, { status: 400 })
  }

  // 1. Create the school
  const { data: school, error: schoolError } = await supabaseAdmin
    .from('schools')
    .insert({
      name,
      slug,
      plan,
      plan_expires_at: plan_expires_at || null,
      is_active: true,
      max_students,
      max_teachers,
      max_parents,
    })
    .select()
    .single()

  if (schoolError) {
    return NextResponse.json({ message: schoolError.message }, { status: 500 })
  }

  // 2. Create admin Supabase Auth user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: admin_email,
    password: admin_password,
    email_confirm: true,
  })

  if (authError) {
    // Rollback school
    await supabaseAdmin.from('schools').delete().eq('id', school.id)
    return NextResponse.json({ message: authError.message }, { status: 400 })
  }

  // 3. Create admin user_profile
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      user_id: authUser.user.id,
      school_id: school.id,
      full_name: admin_name,
      role: 'admin',
      is_active: true,
    })

  if (profileError) {
    // Rollback
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    await supabaseAdmin.from('schools').delete().eq('id', school.id)
    return NextResponse.json({ message: profileError.message }, { status: 500 })
  }

  // 4. Create default school settings
  await supabaseAdmin.from('school_settings').insert({
    school_id: school.id,
    late_cutoff: '08:00',
    sms_enabled: true,
    whatsapp_enabled: false,
    timezone: 'Africa/Lagos',
  })

  // 5. Log the subscription action
  await supabaseAdmin.from('subscription_logs').insert({
    school_id: school.id,
    action: 'activated',
    new_plan: plan,
    note: `School created with plan: ${plan}`,
    performed_by: session.email,
  })

  return NextResponse.json({ success: true, school })
}