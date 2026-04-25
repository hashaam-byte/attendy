import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/manage-user
// body: { type: 'student'|'staff', id: string, action: 'suspend'|'activate'|'delete', school_id: string }
export async function POST(req: NextRequest) {
  // Verify caller is an admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('user_profiles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden: admin only' }, { status: 403 })
  }

  const { type, id, action, school_id } = await req.json()

  if (!type || !id || !action || !school_id) {
    return NextResponse.json({ message: 'type, id, action, school_id required' }, { status: 400 })
  }

  // Ensure admin can only manage their own school
  if (callerProfile.school_id !== school_id) {
    return NextResponse.json({ message: 'Forbidden: wrong school' }, { status: 403 })
  }

  if (type === 'student') {
    // Verify student belongs to this school
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id, school_id')
      .eq('id', id)
      .eq('school_id', school_id)
      .single()

    if (!student) return NextResponse.json({ message: 'Student not found' }, { status: 404 })

    if (action === 'delete') {
      // Soft delete: set is_active=false (preserves attendance history)
      const { error } = await supabaseAdmin
        .from('students')
        .update({ is_active: false })
        .eq('id', id)
        .eq('school_id', school_id)
      if (error) return NextResponse.json({ message: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: 'Student deactivated' })
    }

    if (action === 'suspend' || action === 'activate') {
      const { error } = await supabaseAdmin
        .from('students')
        .update({ is_active: action === 'activate' })
        .eq('id', id)
        .eq('school_id', school_id)
      if (error) return NextResponse.json({ message: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }
  }

  if (type === 'staff') {
    // Verify staff profile belongs to this school
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, school_id, user_id, role')
      .eq('id', id)
      .eq('school_id', school_id)
      .single()

    if (!profile) return NextResponse.json({ message: 'Staff not found' }, { status: 404 })

    // Prevent admin from deactivating themselves
    if (profile.user_id === user.id) {
      return NextResponse.json({ message: 'Cannot modify your own account' }, { status: 400 })
    }

    // Prevent modifying another admin
    if (profile.role === 'admin') {
      return NextResponse.json({ message: 'Cannot modify another admin account' }, { status: 403 })
    }

    if (action === 'delete') {
      // Deactivate profile so they can't log in
      await supabaseAdmin
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', id)
        .eq('school_id', school_id)

      // Also disable the auth account so JWT tokens stop working
      await supabaseAdmin.auth.admin.updateUserById(profile.user_id, { ban_duration: 'none' })
      // Sign them out of all sessions
      await supabaseAdmin.auth.admin.signOut(profile.user_id, 'global')

      return NextResponse.json({ success: true, message: 'Staff deactivated and signed out' })
    }

    if (action === 'suspend' || action === 'activate') {
      await supabaseAdmin
        .from('user_profiles')
        .update({ is_active: action === 'activate' })
        .eq('id', id)
        .eq('school_id', school_id)

      if (action === 'suspend') {
        // Force sign out on suspend
        await supabaseAdmin.auth.admin.signOut(profile.user_id, 'global')
      }

      return NextResponse.json({ success: true })
    }
  }

  return NextResponse.json({ message: 'Invalid action or type' }, { status: 400 })
}
