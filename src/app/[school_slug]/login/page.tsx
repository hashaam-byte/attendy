'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin() {
    setLoading(true)

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

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      toast.error('Invalid email or password.')
      setLoading(false)
      return
    }

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

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/${school_slug}/auth/callback` },
    })
  }

  const schoolName = school_slug.replace(/-/g, ' ')

  return (
    <div className="min-h-screen flex items-center justify-center p-4
      bg-zinc-100 dark:bg-zinc-950 transition-colors duration-300">

      <div className="w-full max-w-3xl flex rounded-2xl overflow-hidden
        border border-zinc-200 dark:border-zinc-800
        bg-white dark:bg-zinc-900 shadow-sm">

        {/* ── Left brand panel ── */}
        <div className="hidden md:flex w-52 flex-shrink-0 bg-green-600
          flex-col justify-between p-6">
          <div>
            {/* Icon */}
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center
              justify-center mb-4">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3
                  L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7
                  12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z"/>
              </svg>
            </div>

            <h2 className="text-white font-medium text-[15px] leading-snug capitalize">
              {schoolName}
            </h2>
            <p className="text-white/55 text-[11px] mt-1">Attendance Portal</p>

            {/* Role pills */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {['Admin', 'Teacher', 'Parent', 'Gateman'].map(role => (
                <span key={role}
                  className="text-[10px] px-2 py-0.5 rounded-full
                    bg-white/15 text-white/80 border border-white/20">
                  {role}
                </span>
              ))}
            </div>
          </div>

          {/* Decorative dots */}
          <div className="flex gap-1.5 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex-1 px-8 py-10 flex flex-col justify-center
          bg-white dark:bg-zinc-900">

          {/* Mobile-only school name */}
          <div className="flex items-center gap-2 mb-6 md:hidden">
            <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3
                  L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7
                  12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 capitalize">
              {schoolName}
            </span>
          </div>

          <div className="mb-6">
            <h1 className="text-[18px] font-semibold text-zinc-900 dark:text-zinc-50">
              Welcome back
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              Sign in to continue to your school account
            </p>
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-[11px] font-medium text-zinc-500
              dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                text-zinc-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@school.com"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg
                  bg-zinc-50 dark:bg-zinc-800
                  border border-zinc-200 dark:border-zinc-700
                  text-zinc-900 dark:text-zinc-100
                  placeholder:text-zinc-400 dark:placeholder:text-zinc-600
                  focus:border-green-500 dark:focus:border-green-500
                  focus:ring-2 focus:ring-green-500/15 focus:outline-none
                  transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-medium text-zinc-500
                dark:text-zinc-400 uppercase tracking-wide">
                Password
              </label>
              <a href="#"
                className="text-[11px] text-green-600 hover:text-green-700
                  dark:text-green-500 dark:hover:text-green-400 transition-colors">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                text-zinc-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg
                  bg-zinc-50 dark:bg-zinc-800
                  border border-zinc-200 dark:border-zinc-700
                  text-zinc-900 dark:text-zinc-100
                  placeholder:text-zinc-400 dark:placeholder:text-zinc-600
                  focus:border-green-500 dark:focus:border-green-500
                  focus:ring-2 focus:ring-green-500/15 focus:outline-none
                  transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                  text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300
                  transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword
                  ? <EyeOff className="w-3.5 h-3.5" />
                  : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Sign in button */}
          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full flex items-center justify-center gap-2 py-2.5
              bg-green-600 hover:bg-green-700 active:scale-[0.99]
              disabled:opacity-50 disabled:cursor-not-allowed
              text-white text-sm font-medium rounded-lg transition-all"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                </svg>
                Signing in…
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Sign in
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <hr className="flex-1 border-zinc-200 dark:border-zinc-700" />
            <span className="text-[11px] text-zinc-400 dark:text-zinc-600">or</span>
            <hr className="flex-1 border-zinc-200 dark:border-zinc-700" />
          </div>

          {/* Google SSO */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 py-2.5
              text-sm text-zinc-600 dark:text-zinc-400
              border border-zinc-200 dark:border-zinc-700
              bg-zinc-50 dark:bg-zinc-800
              hover:bg-zinc-100 dark:hover:bg-zinc-700/60
              rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded
              bg-green-100 dark:bg-green-900/40
              text-green-700 dark:text-green-400
              border border-green-200 dark:border-green-800">
              New
            </span>
          </button>

          {/* Trust signal */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            <ShieldCheck className="w-3 h-3 text-zinc-400 dark:text-zinc-600" />
            <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
              Secured by{' '}
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                AttendanceOS
              </span>
              {' '}· Sessions are end-to-end encrypted
            </p>
          </div>

          {/* Footer links */}
          <div className="flex justify-center gap-4 mt-3">
            {['Privacy policy', 'Terms of use', 'Help'].map(link => (
              <a key={link} href="#"
                className="text-[10px] text-zinc-400 dark:text-zinc-600
                  hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}