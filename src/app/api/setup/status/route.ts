import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { count } = await supabaseAdmin
    .from('head_admins')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({ exists: (count ?? 0) > 0 })
}
