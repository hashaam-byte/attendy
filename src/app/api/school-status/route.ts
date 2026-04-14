import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for this public-facing check so RLS doesn't block it
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase()

  if (!slug) {
    return NextResponse.json({ error: 'slug parameter required' }, { status: 400 })
  }

  // Validate slug format
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
    return NextResponse.json({
      found: false,
      status: 'invalid',
      message: 'Invalid slug format',
    })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('schools')
      .select('id, name, slug, is_active, plan, created_at')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('[school-status] DB error:', error)
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({
        found: false,
        status: 'not_found',
        message: `No school found with slug: ${slug}`,
      })
    }

    return NextResponse.json({
      found: true,
      status: data.is_active ? 'active' : 'suspended',
      school: {
        name: data.name,
        slug: data.slug,
        is_active: data.is_active,
        plan: data.plan,
        // Don't expose internal id or full created_at for security
        registered: data.created_at ? new Date(data.created_at).getFullYear() : null,
      },
    })
  } catch (err) {
    console.error('[school-status] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
