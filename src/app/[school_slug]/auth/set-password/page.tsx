'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function SetPasswordPage() {
  const router = useRouter()
  const params = useParams()
  const school_slug = params?.school_slug as string
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Verify we actually have a valid session (set by the callback route)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // No session — the link was invalid or expired; send back to login
        router.replace(`/${school_slug}/login?error=invalid_token`)
        return
      }
      setSessionReady(true)
    })
  }, [])

  async function handleSubmit() {
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDone(true)

    // Redirect to role-appropriate dashboard after a short pause
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push(`/${school_slug}/login`); return }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()
      const routes: Record<string, string> = {
        admin:   `/${school_slug}/admin/dashboard`,
        teacher: `/${school_slug}/teacher/scan`,
        gateman: `/${school_slug}/gateman/scan`,
        parent:  `/${school_slug}/parent/my-child`,
      }
      router.push(routes[profile?.role ?? ''] ?? `/${school_slug}/login`)
    }, 2000)
  }

  const schoolName = school_slug?.replace(/-/g, ' ')

  if (!sessionReady && !done) {
    return (
      <div style={{ minHeight: '100vh', background: '#080c0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono, monospace', color: '#3a4e40', fontSize: 12, letterSpacing: 2 }}>
        <div style={{ width: 20, height: 20, border: '2px solid #1a2420', borderTopColor: '#00e676', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 12 }} />
        VERIFYING...
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080c0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'IBM Plex Sans, sans-serif', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes rise { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .sp-card { animation: rise 0.4s cubic-bezier(0.22,0.68,0,1.2); }
      `}</style>

      <div className="sp-card" style={{ width: '100%', maxWidth: 400 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, background: '#16a34a', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', boxShadow: '0 0 28px rgba(22,163,74,0.4)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7 12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z"/>
            </svg>
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#e2ece6', letterSpacing: -0.3 }}>Attendy</div>
          <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#4a6050', letterSpacing: 1, textTransform: 'capitalize' }}>{schoolName}</div>
        </div>

        <div style={{ background: '#0d1410', border: '1px solid #1a2420', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '28px 26px 30px' }}>

            {done ? (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: 56, height: 56, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <CheckCircle2 size={28} color="#4ade80" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#e2ece6', marginBottom: 8 }}>Password updated!</div>
                <div style={{ fontSize: 13, color: '#5a7060', lineHeight: 1.6 }}>Taking you to your dashboard…</div>
              </div>
            ) : (
              <>
                <div style={{ width: 46, height: 46, borderRadius: 11, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <KeyRound size={22} color="#4ade80" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#e2ece6', marginBottom: 6, letterSpacing: -0.3 }}>Set a new password</div>
                <div style={{ fontSize: 13, color: '#5a7060', lineHeight: 1.6, marginBottom: 24 }}>Choose a strong password for your account.</div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 7, padding: '10px 12px', fontSize: 12, color: '#f87171', marginBottom: 14, lineHeight: 1.5 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    {error}
                  </div>
                )}

                {/* Password field */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#4a6050', marginBottom: 7 }}>New password</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#2a3e30' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      autoFocus
                      style={{ width: '100%', background: '#0a100c', border: '1px solid #1a2420', borderRadius: 8, padding: '11px 40px 11px 36px', fontSize: 14, fontFamily: 'IBM Plex Sans, sans-serif', color: '#e2ece6', outline: 'none' }}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4a6050', cursor: 'pointer', padding: 0 }}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm field */}
                <div style={{ marginBottom: 4 }}>
                  <label style={{ display: 'block', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#4a6050', marginBottom: 7 }}>Confirm password</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#2a3e30' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError('') }}
                      placeholder="Repeat password"
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      autoComplete="new-password"
                      style={{ width: '100%', background: '#0a100c', border: '1px solid #1a2420', borderRadius: 8, padding: '11px 12px 11px 36px', fontSize: 14, fontFamily: 'IBM Plex Sans, sans-serif', color: '#e2ece6', outline: 'none' }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !password || !confirm}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: 13, fontSize: 14, fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 600, cursor: 'pointer', marginTop: 16, opacity: (loading || !password || !confirm) ? 0.45 : 1 }}
                >
                  {loading ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <KeyRound size={16} />}
                  {loading ? 'Saving…' : 'Save new password'}
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 11, color: '#2a3e30' }}>
          <a href={`/${school_slug}/login`} style={{ color: '#3a4e40', textDecoration: 'none' }}>← Back to sign in</a>
        </div>
      </div>
    </div>
  )
}