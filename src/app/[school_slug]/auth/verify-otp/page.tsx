'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ShieldCheck, KeyRound, Eye, EyeOff,
  CheckCircle2, AlertCircle, Loader2, RefreshCw,
} from 'lucide-react'

type Stage = 'otp' | 'password' | 'done'

export default function VerifyOtpPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const school_slug = params?.school_slug as string
  const router = useRouter()
  const supabase = createClient()

  const emailFromUrl = searchParams?.get('email') ?? ''

  const [stage, setStage] = useState<Stage>('otp')
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState(emailFromUrl)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [staffName, setStaffName] = useState('')
  const [schoolDisplayName, setSchoolDisplayName] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendSent, setResendSent] = useState(false)

  const schoolName = school_slug ? school_slug.replace(/-/g, ' ') : ''

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  // ── OTP verification ──────────────────────────────────────────
  // Try ALL possible token types that Supabase might have used.
  // Order matters: try the most likely ones first.
  async function handleOtpSubmit() {
    if (!email.trim()) {
      setError('Please enter the email address the invite was sent to')
      return
    }
    if (otp.trim().length !== 6) {
      setError('Please enter the full 6-digit code from your email')
      return
    }

    setError('')
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()
    const cleanToken = otp.trim()

    // Try all token types Supabase may have used.
    // 'signup' = for new/unconfirmed users (createUser with email_confirm:false + generateLink signup)
    // 'invite' = for inviteUserByEmail
    // 'magiclink' = for confirmed users
    // 'email' = generic fallback
    const typesToTry: Array<'signup' | 'invite' | 'magiclink' | 'email'> = [
      'signup',
      'invite', 
      'magiclink',
      'email',
    ]

    let verifiedUser = null
    let lastError = ''

    for (const type of typesToTry) {
      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type,
        })

        if (!verifyError && data?.user) {
          verifiedUser = data.user
          console.log('[verify-otp] Success with type:', type)
          break
        } else if (verifyError) {
          lastError = verifyError.message
          console.log('[verify-otp] Failed type:', type, verifyError.message)
        }
      } catch (err) {
        console.log('[verify-otp] Exception for type:', type, err)
        // continue to next type
      }
    }

    if (!verifiedUser) {
      setError(
        'Invalid or expired code. Make sure you entered all 6 digits correctly. ' +
        'The code expires after 1 hour — click "Resend code" to get a fresh one.'
      )
      setLoading(false)
      return
    }

    // Fetch profile for welcome message
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', verifiedUser.id)
        .single()
      if (profile?.full_name) setStaffName(profile.full_name)
    } catch {}

    // Fetch school display name
    try {
      const { data: school } = await supabase
        .from('schools')
        .select('name')
        .eq('slug', school_slug)
        .single()
      if (school?.name) setSchoolDisplayName(school.name)
    } catch {}

    setLoading(false)
    setStage('password')
  }

  // ── Resend code ───────────────────────────────────────────────
  async function handleResend() {
    if (!email.trim()) { setError('Enter your email address first'); return }
    if (resendCooldown > 0) return
    setResendLoading(true)
    setError('')
    setResendSent(false)

    try {
      const res = await fetch('/api/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          school_slug,
        }),
      })
      const json = await res.json()

      if (res.status === 429) {
        const match = json.message?.match(/(\d+)s/)
        setResendCooldown(match ? parseInt(match[1]) : 60)
      } else if (!res.ok) {
        setError(json.message ?? 'Failed to resend. Ask your admin to re-invite you.')
      } else {
        setOtp('')
        setResendSent(true)
        setResendCooldown(60)
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setResendLoading(false)
  }

  // ── Set password ──────────────────────────────────────────────
  async function handlePasswordSubmit() {
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
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

    setLoading(false)
    setStage('done')

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

  const stageOrder: Stage[] = ['otp', 'password', 'done']
  const stageLabels = ['Verify', 'Password', 'Done']

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .root {
          min-height: 100vh;
          background: #080c0a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          font-family: 'IBM Plex Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .root::before {
          content: '';
          position: fixed; inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px);
          pointer-events: none; z-index: 0;
        }
        .glow {
          position: fixed; top: -180px; left: 50%; transform: translateX(-50%);
          width: 600px; height: 450px;
          background: radial-gradient(ellipse, rgba(22,163,74,0.14) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        .card {
          width: 100%; max-width: 400px;
          position: relative; z-index: 1;
          animation: rise 0.45s cubic-bezier(.22,.68,0,1.2) both;
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .brand {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; margin-bottom: 28px;
        }
        .brand-logo {
          width: 44px; height: 44px;
          background: #16a34a;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 28px rgba(22,163,74,0.4), 0 0 60px rgba(22,163,74,0.15);
        }
        .brand-name {
          font-size: 19px; font-weight: 700;
          color: #e2ece6; letter-spacing: -0.3px;
          margin-top: 2px;
        }
        .brand-school {
          font-size: 11px; font-family: 'IBM Plex Mono', monospace;
          color: #4a6050; letter-spacing: 1px; text-transform: capitalize;
        }

        .panel {
          background: #0d1410;
          border: 1px solid #1a2420;
          border-radius: 16px; overflow: hidden;
        }

        .stepper {
          display: flex;
          padding: 14px 20px;
          background: rgba(0,0,0,0.25);
          border-bottom: 1px solid #111c14;
          gap: 0;
        }
        .step-item {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; gap: 5px; position: relative;
        }
        .step-item:not(:last-child)::after {
          content: '';
          position: absolute; top: 10px;
          left: calc(50% + 14px); right: calc(-50% + 14px);
          height: 1px; background: #1a2420;
        }
        .step-dot {
          width: 20px; height: 20px; border-radius: 50%;
          background: #111c14; border: 1px solid #243028;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; color: #3a4e40;
          transition: all 0.25s; z-index: 1;
          font-family: 'IBM Plex Mono', monospace;
        }
        .step-item.active .step-dot {
          background: #0f4a25; border-color: #16a34a;
          color: #4ade80; box-shadow: 0 0 10px rgba(22,163,74,0.4);
        }
        .step-item.done .step-dot {
          background: #16a34a; border-color: #16a34a; color: white;
        }
        .step-label {
          font-size: 9px; font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 0.5px; text-transform: uppercase; color: #2a3e30;
          transition: color 0.25s;
        }
        .step-item.active .step-label, .step-item.done .step-label { color: #4ade80; }

        .body { padding: 28px 26px 30px; }

        .icon-badge {
          width: 46px; height: 46px; border-radius: 11px;
          background: rgba(22,163,74,0.1);
          border: 1px solid rgba(22,163,74,0.2);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
        }

        h2 { font-size: 18px; font-weight: 600; color: #e2ece6; letter-spacing: -0.3px; margin: 0 0 6px; }
        .sub { font-size: 13px; color: #5a7060; line-height: 1.6; margin-bottom: 22px; }
        .sub strong { color: #4ade80; font-weight: 500; }

        .field { margin-bottom: 14px; }
        .label {
          display: block; font-size: 10px; font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 1.5px; text-transform: uppercase; color: #4a6050;
          margin-bottom: 7px;
        }
        .input-wrap { position: relative; }
        .input-icon {
          position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
          color: #2a3e30; pointer-events: none;
        }
        .input {
          width: 100%; background: #0a100c; border: 1px solid #1a2420;
          border-radius: 8px; padding: 11px 12px 11px 36px;
          font-size: 14px; font-family: 'IBM Plex Sans', sans-serif;
          color: #e2ece6; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input:focus {
          border-color: rgba(22,163,74,0.45);
          box-shadow: 0 0 0 3px rgba(22,163,74,0.08);
        }
        .input::placeholder { color: #2a3e30; }
        .eye-btn {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #4a6050; cursor: pointer;
          padding: 0; line-height: 1;
        }
        .eye-btn:hover { color: #e2ece6; }

        /* OTP input — large, centered 6 digits */
        .otp-input {
          width: 100%; background: #0a100c;
          border: 1px solid #1a2420; border-radius: 8px;
          padding: 16px 12px;
          font-size: 36px; font-family: 'IBM Plex Mono', monospace;
          font-weight: 600; color: #4ade80;
          letter-spacing: 20px; text-align: center; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .otp-input:focus {
          border-color: rgba(22,163,74,0.45);
          box-shadow: 0 0 0 3px rgba(22,163,74,0.08);
        }
        .otp-input::placeholder { color: #1a2820; letter-spacing: 20px; }

        .otp-hint {
          text-align: center;
          font-size: 11px;
          color: #3a4e40;
          margin-top: 8px;
          font-family: 'IBM Plex Mono', monospace;
        }

        .info-box {
          background: rgba(22,163,74,0.04); border: 1px solid rgba(22,163,74,0.1);
          border-radius: 7px; padding: 11px 13px;
          font-size: 12px; color: #4a6050; line-height: 1.65;
          margin-bottom: 16px;
        }
        .info-box strong { color: #4ade80; font-weight: 500; }

        .success-box {
          background: rgba(22,163,74,0.08); border: 1px solid rgba(22,163,74,0.2);
          border-radius: 7px; padding: 10px 13px;
          font-size: 12px; color: #4ade80; line-height: 1.65;
          margin-bottom: 14px;
        }

        .error-box {
          display: flex; align-items: flex-start; gap: 8px;
          background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15);
          border-radius: 7px; padding: 10px 12px;
          font-size: 12px; color: #f87171; margin-bottom: 14px; line-height: 1.5;
        }

        .btn {
          width: 100%; display: flex; align-items: center; justify-content: center;
          gap: 8px; background: #16a34a; color: white; border: none;
          border-radius: 8px; padding: 13px;
          font-size: 14px; font-family: 'IBM Plex Sans', sans-serif; font-weight: 600;
          cursor: pointer; margin-top: 4px;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
        }
        .btn:hover { background: #15803d; box-shadow: 0 4px 18px rgba(22,163,74,0.28); }
        .btn:active { transform: scale(0.99); }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

        .resend-row {
          display: flex; align-items: center; justify-content: center;
          gap: 6px; margin-top: 14px; font-size: 12px; color: #3a4e40;
          flex-wrap: wrap; text-align: center;
        }
        .resend-btn {
          background: none; border: none; cursor: pointer;
          color: #4ade80; font-size: 12px; font-family: 'IBM Plex Sans', sans-serif;
          display: flex; align-items: center; gap: 5px;
          padding: 0; text-decoration: underline; text-underline-offset: 3px;
        }
        .resend-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .resend-timer { color: #2a3e30; font-family: 'IBM Plex Mono', monospace; }

        .done-wrap { text-align: center; padding: 8px 0 4px; }
        .done-icon {
          width: 56px; height: 56px;
          background: rgba(22,163,74,0.1); border: 1px solid rgba(22,163,74,0.25);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          margin: 0 auto 18px;
          animation: pop 0.4s cubic-bezier(.22,.68,0,1.5) both;
        }
        @keyframes pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .done-title { font-size: 18px; font-weight: 600; color: #e2ece6; margin-bottom: 8px; }
        .done-sub { font-size: 13px; color: #5a7060; line-height: 1.6; }

        .footer { text-align: center; margin-top: 18px; font-size: 11px; color: #2a3e30; }
        .footer a { color: #3a4e40; text-decoration: none; }
        .footer a:hover { color: #4ade80; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>

      <div className="glow" />

      <div className="card">
        {/* Brand */}
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
          {/* Stepper */}
          <div className="stepper">
            {stageLabels.map((label, i) => {
              const currentIdx = stageOrder.indexOf(stage)
              const cls = i < currentIdx ? 'done' : i === currentIdx ? 'active' : ''
              return (
                <div key={label} className={`step-item ${cls}`}>
                  <div className="step-dot">{i < currentIdx ? '✓' : i + 1}</div>
                  <span className="step-label">{label}</span>
                </div>
              )
            })}
          </div>

          <div className="body">

            {/* ── OTP stage ── */}
            {stage === 'otp' && (
              <>
                <div className="icon-badge">
                  <ShieldCheck size={22} color="#4ade80" />
                </div>
                <h2>Enter your code</h2>
                <div className="sub">
                  Check your email for a <strong>6-digit code</strong> from Attendy. Enter it below to verify your account.
                </div>

                <div className="info-box">
                  📬 Check your <strong>inbox and spam/junk folder</strong>. The code is <strong>6 digits</strong> and expires in <strong>1 hour</strong>.
                  <br /><br />
                  💡 The subject line will be from <strong>Supabase</strong> or your app name — check spam if you don't see it.
                </div>

                {resendSent && (
                  <div className="success-box">
                    ✅ A new 6-digit code has been sent. Check your inbox and spam folder.
                  </div>
                )}

                {error && (
                  <div className="error-box">
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    {error}
                  </div>
                )}

                <div className="field">
                  <label className="label">Your email</label>
                  <div className="input-wrap">
                    <svg className="input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <input
                      className="input"
                      type="email"
                      placeholder="email the invite was sent to"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label">6-digit code</label>
                  <input
                    className="otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="······"
                    value={otp}
                    onChange={e => {
                      setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                      setError('')
                    }}
                    onKeyDown={e => e.key === 'Enter' && otp.length === 6 && handleOtpSubmit()}
                    autoFocus
                  />
                  <div className="otp-hint">Numbers only — enter all 6 digits</div>
                </div>

                <button
                  className="btn"
                  onClick={handleOtpSubmit}
                  disabled={loading || otp.length !== 6 || !email.trim()}
                >
                  {loading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
                  {loading ? 'Verifying…' : 'Verify code'}
                </button>

                <div className="resend-row">
                  Code expired or not received?{' '}
                  {resendCooldown > 0 ? (
                    <span className="resend-timer">resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      className="resend-btn"
                      onClick={handleResend}
                      disabled={resendLoading || !email.trim()}
                    >
                      {resendLoading ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
                      {resendLoading ? 'Sending…' : 'Resend code'}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── Password stage ── */}
            {stage === 'password' && (
              <>
                <div className="icon-badge">
                  <KeyRound size={22} color="#4ade80" />
                </div>
                <h2>Welcome{staffName ? `, ${staffName.split(' ')[0]}` : ''}! 👋</h2>
                <div className="sub">
                  You're verified as staff at <strong>{schoolDisplayName || schoolName}</strong>. Set a password to complete your account setup.
                </div>
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
                      autoComplete="new-password"
                      autoFocus
                      style={{ paddingRight: '40px' }}
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
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                      onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                      autoComplete="new-password"
                      style={{ paddingRight: '40px' }}
                    />
                  </div>
                </div>
                <button
                  className="btn"
                  onClick={handlePasswordSubmit}
                  disabled={loading || !password || !confirmPassword}
                >
                  {loading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
                  {loading ? 'Setting password…' : 'Set password & continue'}
                </button>
              </>
            )}

            {/* ── Done ── */}
            {stage === 'done' && (
              <div className="done-wrap">
                <div className="done-icon">
                  <CheckCircle2 size={28} color="#4ade80" />
                </div>
                <div className="done-title">You're all set!</div>
                <div className="done-sub">Account ready. Taking you to your dashboard…</div>
              </div>
            )}
          </div>
        </div>

        <div className="footer">
          Already have a password?{' '}
          <a href={`/${school_slug}/login`}>Sign in here →</a>
        </div>
      </div>
    </div>
  )
}