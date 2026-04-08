'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)

    // 1. Check school exists and is active
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, is_active')
      .eq('slug', school_slug)
      .single()

    if (schoolError || !school) {
      toast.error('School not found. Check your link.')
      setLoading(false)
      return
    }

    if (!school.is_active) {
      toast.error('This school account has been suspended. Contact support.')
      setLoading(false)
      return
    }

    // 2. Sign in
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      toast.error('Invalid email or password.')
      setLoading(false)
      return
    }

    // 3. Get role → redirect
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    const roleRoutes: Record<string, string> = {
      admin: `/${school_slug}/admin/dashboard`,
      teacher: `/${school_slug}/teacher/scan`,
      gateman: `/${school_slug}/gateman/scan`,
      parent: `/${school_slug}/parent/my-child`,
    }

    router.push(roleRoutes[profile?.role ?? 'parent'])
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-green-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl">🏫</span>
          </div>
          <h1 className="text-white text-2xl font-bold capitalize">
            {school_slug.replace(/-/g, ' ')}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Attendance Portal</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@school.com"
              className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white p-3 rounded-lg font-semibold transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <p className="text-gray-600 text-xs text-center mt-6">
          Having trouble? Contact your school admin.
        </p>
      </div>
    </div>
  )
}