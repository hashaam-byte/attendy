'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function SetPasswordPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    // Verify we actually have an active session (set by /auth/callback)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        // No session — send back to login
        router.replace(`/${school_slug}/login?error=missing_token`)
        return
      }
      setSessionReady(true)

      // Try to get their name for the welcome message
      supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) setUserName(data.full_name.split(' ')[0])
        })
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

    setLoading(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDone(true)

    // Redirect to role-appropriate home after 2s
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

  const schoolName = school_slug?.replace(/-/g, ' ') ?? ''

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        :root {
          --bg: #080c0a; --surface: #0d1410; --border: #1a2420;
          --green: #00e676; --green-dim: rgba(0,230,118,0.08);
          --green-text: #4ade80; --text: #e2ece6; --muted: #5a7060;
          --mono: 'IBM Plex Mono', monospace; --sans: 'IBM Plex Sans', sans-serif;
        }
        .root {
          min-height: 100vh; background: var(--bg);
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem; font-family: var(--sans); color: var(--text);
          position: relative;
        }
        .root::before {
          content: ''; position: fixed; inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px);
          pointer-events: none;
        }
        .glow {
          position: fixed; top: -180px; left: 50%; transform: translateX(-50%);
          width: 600px; height: 450px;
          background: radial-gradient(ellipse, rgba(22,163,74,0.14) 0%, transparent 70%);
          pointer-events: none;
        }
        .card { width: 100%; max-width: 400px; z-index: 1; animation: rise 0.4s cubic-bezier(.22,.68,0,1.2) both; }
        @keyframes rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .brand { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 28px; }
        .brand-logo { width: 44px; height: 44px; background: #16a34a; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 28px rgba(22,163,74,0.4); }
        .brand-name { font-size: 19px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
        .brand-school { font-size: 11px; font-family: var(--mono); color: #4a6050; letter-spacing: 1px; text-transform: capitalize; }

        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .body { padding: 28px 26px 30px; }

        .icon-badge { width: 46px; height: 46px; border-radius: 11px; background: rgba(22,163,74,0.1); border: 1px solid rgba(22,163,74,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
        h2 { font-size: 18px; font-weight: 600; color: var(--text); letter-spacing: -0.3px; margin: 0 0 6px; }
        .sub { font-size: 13px; color: var(--muted); line-height: 1.6; margin-bottom: 22px; }
        .sub strong { color: var(--green-text); font-weight: 500; }

        .field { margin-bottom: 14px; }
        .label { display: block; font-size: 10px; font-family: var(--mono); letter-spacing: 1.5px; text-transform: uppercase; color: #4a6050; margin-bottom: 7px; }
        .input-wrap { position: relative; }
        .input-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #2a3e30; pointer-events: none; }
        .input { width: 100%; background: #0a100c; border: 1px solid var(--border); border-radius: 8px; padding: 11px 40px 11px 36px; font-size: 14px; font-family: var(--sans); color: var(--text); outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .input:focus { border-color: rgba(22,163,74,0.45); box-shadow: 0 0 0 3px rgba(22,163,74,0.08); }
        .input::placeholder { color: #2a3e30; }
        .eye-btn { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #4a6050; cursor: pointer; }
        .eye-btn:hover { color: var(--text); }

        .error-box { display: flex; align-items: flex-start; gap: 8px; background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15); border-radius: 7px; padding: 10px 12px; font-size: 12px; color: #f87171; margin-bottom: 14px; line-height: 1.5; }
        .btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: #16a34a; color: white; border: none; border-radius: 8px; padding: 13px; font-size: 14px; font-family: var(--sans); font-weight: 600; cursor: pointer; transition: background 0.15s, box-shadow 0.15s; }
        .btn:hover { background: #15803d; box-shadow: 0 4px 18px rgba(22,163,74,0.28); }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

        .done-wrap { text-align: center; }
        .done-icon { width: 56px; height: 56px; background: rgba(22,163,74,0.1); border: 1px solid rgba(22,163,74,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; animation: pop 0.4s cubic-bezier(.22,.68,0,1.5) both; }
        @keyframes pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .done-title { font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
        .done-sub { font-size: 13px; color: var(--muted); line-height: 1.6; }

        .loading-wrap { display: flex; align-items: center; justify-content: center; padding: 40px; color: var(--muted); font-family: var(--mono); font-size: 12px; gap: 12px; }
        .spinner { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="glow" />
      <div className="card">
        <div className="brand">
          <div className="brand-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7 12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z"/>
            </svg>
          </div>
          <div className="brand-name">Attendy</div>
          <div className="brand-school">{schoolName}</div>
        </div>

        <div className="panel">
          <div className="body">
            {!sessionReady && !done && (
              <div className="loading-wrap">
                <div className="spinner" />
                Verifying session…
              </div>
            )}

            {sessionReady && !done && (
              <>
                <div className="icon-badge">
                  <KeyRound size={22} color="#4ade80" />
                </div>
                <h2>{userName ? `Hi ${userName}!` : 'Set your password'}</h2>
                <p className="sub">
                  {userName
                    ? `Welcome to Attendy. Create a password to secure your account at `
                    : `Choose a new password for your account at `}
                  <strong>{schoolName || school_slug}</strong>.
                </p>

                {error && (
                  <div className="error-box">
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    {error}
                  </div>
                )}

                <div className="field">
                  <label className="label">New password</label>
                  <div className="input-wrap">
                    <KeyRound className="input-icon" size={14} />
                    <input
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      autoFocus
                      autoComplete="new-password"
                    />
                    <button className="eye-btn" type="button" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label className="label">Confirm password</label>
                  <div className="input-wrap">
                    <KeyRound className="input-icon" size={14} />
                    <input
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repeat password"
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  className="btn"
                  onClick={handleSubmit}
                  disabled={loading || !password || !confirm}
                >
                  {loading
                    ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Setting password…</>
                    : <><KeyRound size={16} /> Set password & continue</>
                  }
                </button>
              </>
            )}

            {done && (
              <div className="done-wrap">
                <div className="done-icon">
                  <CheckCircle2 size={28} color="#4ade80" />
                </div>
                <div className="done-title">Password set!</div>
                <div className="done-sub">Taking you to your dashboard…</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}