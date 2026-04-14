'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, KeyRound, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function SetPasswordPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [stage, setStage] = useState<'loading' | 'ready' | 'saving' | 'done' | 'error'>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [userName, setUserName] = useState('')

  // The session was already established by /auth/confirm via verifyOtp().
  // We just need to confirm it exists here.
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          setErrorMsg(
            'Your session could not be found. Your invite link may have expired, or you may have already used it. Ask your admin to resend the invite.'
          )
          setStage('error')
          return
        }

        // Get the user's display name from user_profiles or metadata
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, role')
          .eq('user_id', user.id)
          .single()

        setUserName(
          profile?.full_name ??
            user.user_metadata?.pending_full_name ??
            user.email?.split('@')[0] ??
            'there'
        )
        setStage('ready')
      } catch (err) {
        console.error('[set-password] session check error:', err)
        setErrorMsg('Something went wrong verifying your session. Please try again.')
        setStage('error')
      }
    }

    checkSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSetPassword() {
    if (!password || password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setErrorMsg('')
    setStage('saving')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg(error.message)
      setStage('ready')
      return
    }

    setStage('done')

    // Redirect to the role-appropriate home after a short delay
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const roleRoutes: Record<string, string> = {
        admin: `/${school_slug}/admin/dashboard`,
        teacher: `/${school_slug}/teacher/scan`,
        gateman: `/${school_slug}/gateman/scan`,
        parent: `/${school_slug}/parent/my-child`,
      }

      const dest = roleRoutes[profile?.role ?? ''] ?? `/${school_slug}/login`
      router.push(dest)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-900/40">
            <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
              <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7 12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z" />
            </svg>
          </div>
          <h1 className="text-white font-bold text-xl tracking-tight">Attendy</h1>
          <p className="text-zinc-500 text-sm mt-1 capitalize">
            {school_slug.replace(/-/g, ' ')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">

          {/* Loading — checking session */}
          {stage === 'loading' && (
            <div className="p-8 text-center">
              <Loader2 size={32} className="animate-spin text-green-500 mx-auto mb-4" />
              <p className="text-white font-semibold">Verifying your session…</p>
              <p className="text-zinc-500 text-sm mt-1">Just a moment please</p>
            </div>
          )}

          {/* Error */}
          {stage === 'error' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-red-400" />
              </div>
              <h2 className="text-white font-bold text-lg mb-2">Session Invalid or Expired</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">{errorMsg}</p>
              <button
                onClick={() => router.push(`/${school_slug}/login`)}
                className="text-green-400 text-sm hover:text-green-300 underline"
              >
                Go to login page
              </button>
            </div>
          )}

          {/* Ready to set password */}
          {stage === 'ready' && (
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-white font-bold text-xl">
                  Welcome, {userName}! 👋
                </h2>
                <p className="text-zinc-400 text-sm mt-1">
                  You've been added as a staff member. Set a password to complete your account setup.
                </p>
              </div>

              <div className="space-y-4">
                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/15"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                    <p className="text-red-400 text-xs">{errorMsg}</p>
                  </div>
                )}

                <button
                  onClick={handleSetPassword}
                  disabled={!password || !confirm}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <KeyRound size={15} />
                  Set Password & Continue
                </button>
              </div>
            </div>
          )}

          {/* Saving */}
          {stage === 'saving' && (
            <div className="p-8 text-center">
              <Loader2 size={32} className="animate-spin text-green-500 mx-auto mb-4" />
              <p className="text-white font-semibold">Setting your password…</p>
            </div>
          )}

          {/* Done */}
          {stage === 'done' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-400" />
              </div>
              <h2 className="text-white font-bold text-lg mb-2">Password Set!</h2>
              <p className="text-zinc-400 text-sm">Redirecting you to your dashboard…</p>
            </div>
          )}
        </div>

        <p className="text-center text-zinc-600 text-xs mt-4">
          Problems? Contact your school administrator.
        </p>
      </div>
    </div>
  )
}