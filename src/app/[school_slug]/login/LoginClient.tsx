'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react'

interface LoginClientProps {
  schoolSlug: string
  schoolName: string
  urlError?: string
}

const URL_ERROR_MESSAGES: Record<string, string> = {
  oauth_error:     'Sign-in failed. Please try again.',
  no_code:         'Authentication callback missing code. Please try again.',
  exchange_failed: 'Session exchange failed. Please try again.',
  no_user:         'No user found after sign-in. Please try again.',
  no_profile:      'Your account has no profile set up. Contact your school admin.',
  deactivated:     'Your account has been deactivated. Contact your school admin.',
  missing_token:   'Your invite link is invalid or has expired. Ask your admin to resend the invite.',
  invalid_token:   'Your invite link has expired or already been used. Ask your admin to resend the invite.',
}

export default function LoginClient({ schoolSlug, schoolName, urlError }: LoginClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Forgot / first-time password state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      toast.error('Invalid email or password.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('user_id', authData.user.id)
      .single()

    if (profileError || !profile) {
      toast.error('Could not find your school profile. Contact your admin.')
      setLoading(false)
      return
    }

    if (!profile.is_active) {
      toast.error('Your account has been deactivated. Contact your school admin.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    const roleRoutes: Record<string, string> = {
      admin:   `/${schoolSlug}/admin/dashboard`,
      teacher: `/${schoolSlug}/teacher/scan`,
      gateman: `/${schoolSlug}/gateman/scan`,
      parent:  `/${schoolSlug}/parent/my-child`,
    }

    const destination = roleRoutes[profile.role]
    if (!destination) {
      toast.error(`Unknown role: ${profile.role}. Contact your school admin.`)
      setLoading(false)
      return
    }

    router.push(destination)
  }

  async function handleForgotPassword() {
    if (!forgotEmail.trim()) {
      toast.error('Please enter your email address.')
      return
    }
    setForgotLoading(true)

    try {
      await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), school_slug: schoolSlug }),
      })
      // Always show success to avoid email enumeration
      setForgotSent(true)
    } catch {
      setForgotSent(true)
    } finally {
      setForgotLoading(false)
    }
  }

  const errorMessage = urlError
    ? (URL_ERROR_MESSAGES[urlError] ?? `Authentication error: ${urlError}`)
    : null

  // ── Forgot password panel ──────────────────────────────────────
  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4
        bg-zinc-100 dark:bg-zinc-950 transition-colors duration-300">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800
            rounded-2xl overflow-hidden shadow-sm p-8">
            <div className="mb-6">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {forgotSent ? 'Check your email' : 'Set or reset your password'}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                {forgotSent
                  ? 'If an account with that email exists, a password reset link has been sent. Check your inbox (and spam folder).'
                  : 'New staff member? Use this to set your password for the first time, or to reset a forgotten one.'}
              </p>
            </div>

            {!forgotSent && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500
                    dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    Your email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                      text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                      placeholder="you@example.com"
                      autoFocus
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

                <button
                  onClick={handleForgotPassword}
                  disabled={forgotLoading || !forgotEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5
                    bg-green-600 hover:bg-green-700 active:scale-[0.99]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    text-white text-sm font-medium rounded-lg transition-all"
                >
                  {forgotLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                      </svg>
                      Sending…
                    </>
                  ) : (
                    'Send password setup link'
                  )}
                </button>
              </div>
            )}

            <button
              onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail('') }}
              className="mt-4 text-sm text-zinc-500 dark:text-zinc-400
                hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main login form ────────────────────────────────────────────
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

          {/* URL error banner */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10
              border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                {(urlError === 'missing_token' || urlError === 'invalid_token') && (
                  <button
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-red-600 dark:text-red-400 underline mt-1
                      hover:text-red-800 dark:hover:text-red-300"
                  >
                    Set password manually instead →
                  </button>
                )}
              </div>
            </div>
          )}

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
                autoComplete="email"
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
              <button
                type="button"
                className="text-[11px] text-green-600 hover:text-green-700
                  dark:text-green-500 dark:hover:text-green-400 transition-colors"
                onClick={() => {
                  setForgotEmail(email)
                  setShowForgot(true)
                }}
              >
                First time? / Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                text-zinc-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
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

          {/* Parent portal hint */}
          <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-600 mt-4">
            Parent?{' '}
            <a
              href={`/${schoolSlug}/parent/login`}
              className="text-green-600 dark:text-green-500 hover:underline"
            >
              Use the parent portal →
            </a>
          </p>

          {/* New staff hint */}
          <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-600 mt-2">
            New staff?{' '}
            <button
              onClick={() => { setForgotEmail(email); setShowForgot(true) }}
              className="text-green-600 dark:text-green-500 hover:underline"
            >
              Set up your password here
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
