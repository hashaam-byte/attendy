import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LoginClient from './LoginClient'

export default async function LoginPage({
  params,
}: {
  params: Promise<{ school_slug: string }>
}) {
  const { school_slug } = await params
  const supabase = await createClient()

  const { data: school, error } = await supabase
    .from('schools')
    .select('id, name, is_active')
    .eq('slug', school_slug)
    .single()

  if (error || !school) notFound()

  if (!school.is_active) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-white text-xl font-bold mb-2">School Suspended</h1>
          <p className="text-gray-400 text-sm">
            This school account is currently inactive. Please contact support.
          </p>
        </div>
      </div>
    )
  }

  return (
    <LoginClient
      schoolSlug={school_slug}
      schoolName={school.name}
    />
  )
}
