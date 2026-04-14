'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react'

type Stage = 'email' | 'otp' | 'password' | 'done'

export default function VerifyOtpPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [staffName, setStaffName] = useState('')
  const [schoolInfo, setSchoolInfo] = useState<{ name: string } | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const schoolName = school_slug.replace(/-/g, ' ')

  // Stage 1: User enters email to request OTP
  async function handleEmailSubmit() {
    if (!email.trim()) { setError('Please enter your email address'); return }
    setError('')
    setLoading(true)

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    })

    if (otpError) {
      if (
        otpError.message.toLowerCase().includes('user') ||
        otpError.status === 422 ||
        otpError.message.toLowerCase().includes('not found')
      ) {
        setError('No account found for this email. Please contact your school admin to be added.')
      } else {
        setError(otpError.message)
      }
      setLoading(false)
      return
    }

    setLoading(false)
    setStage('otp')
  }

  // Stage 2: User enters 6-digit OTP
  async function handleOtpSubmit() {
    if (otp.trim().length < 8) { setError('Please enter the 8-digit code'); return }
    setError('')
    setLoading(true)

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp.trim(),
      type: 'email',
    })

    if (verifyError || !data.user) {
      setError('Invalid or expired code. Check the code and try again — or request a new one below.')
      setLoading(false)
      return
    }

    // Fetch profile to get name
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, school_id')
      .eq('user_id', data.user.id)
      .single()

    if (profile?.full_name) setStaffName(profile.full_name)

    // Fetch school name
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('slug', school_slug)
      .single()

    if (school) setSchoolInfo(school)

    setLoading(false)
    setStage('password')
  }

  // Stage 3: Set password
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

    // Redirect to role-appropriate dashboard after 2s
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

  async function handleResendOtp() {
    setResendLoading(true)
    setResendSuccess(false)
    setError('')

    const { error: resendError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    })

    setResendLoading(false)
    if (!resendError) {
      setResendSuccess(true)
      setOtp('')
    } else {
      setError('Could not resend code: ' + resendError.message)
    }
  }

  function handleOtpChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 8)
    setOtp(digits)
    setError('')
  }

  return (
    <div className="vp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        .vp-root {
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
        .vp-root::before {
          content: '';
          position: fixed; inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px);
          pointer-events: none; z-index: 0;
        }
        .vp-glow {
          position: fixed;
          top: -200px; left: 50%; transform: translateX(-50%);
          width: 600px; height: 500px;
          background: radial-gradient(ellipse, rgba(22,163,74,0.12) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .vp-card {
          width: 100%; max-width: 420px;
          position: relative; z-index: 1;
          animation: vpAppear 0.4s ease both;
        }
        @keyframes vpAppear {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vp-logo {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 28px; justify-content: center;
        }
        .vp-logo-icon {
          width: 36px; height: 36px; background: #16a34a;
          border-radius: 9px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(22,163,74,0.35);
        }
        .vp-logo-name { font-size: 18px; font-weight: 700; color: #e2ece6; letter-spacing: -0.3px; }
        .vp-school-tag {
          font-size: 11px; font-family: 'IBM Plex Mono', monospace;
          color: #5a7060; letter-spacing: 1px; text-transform: capitalize;
          text-align: center; margin-bottom: 24px;
        }
        .vp-panel {
          background: #0d1410; border: 1px solid #1a2420;
          border-radius: 14px; overflow: hidden;
        }
        .vp-steps {
          display: flex; padding: 14px 20px; gap: 0;
          border-bottom: 1px solid #1a2420; background: rgba(0,0,0,0.2);
        }
        .vp-step {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; gap: 4px; position: relative;
        }
        .vp-step:not(:last-child)::after {
          content: ''; position: absolute;
          top: 10px; left: calc(50% + 12px); right: calc(-50% + 12px);
          height: 1px; background: #1a2420;
        }
        .vp-step.active .vp-step-dot { background: #16a34a; box-shadow: 0 0 8px rgba(22,163,74,0.5); }
        .vp-step.done .vp-step-dot { background: #16a34a; }
        .vp-step-dot {
          width: 20px; height: 20px; border-radius: 50%;
          background: #1a2420; border: 1px solid #243028;
          position: relative; transition: all 0.2s; z-index: 1;
        }
        .vp-step.done .vp-step-dot::after {
          content: '✓'; color: white; font-size: 10px;
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }
        .vp-step-label {
          font-size: 9px; font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 0.5px; text-transform: uppercase; color: #3a4e40;
          transition: color 0.2s;
        }
        .vp-step.active .vp-step-label,
        .vp-step.done .vp-step-label { color: #4ade80; }
        .vp-body { padding: 28px 28px 32px; }
        .vp-icon-wrap {
          width: 48px; height: 48px; border-radius: 12px;
          background: rgba(22,163,74,0.1); border: 1px solid rgba(22,163,74,0.2);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
        }
        .vp-title {
          font-size: 19px; font-weight: 600; color: #e2ece6;
          letter-spacing: -0.4px; margin-bottom: 6px;
        }
        .vp-subtitle {
          font-size: 13px; color: #5a7060; line-height: 1.6; margin-bottom: 24px;
        }
        .vp-subtitle strong { color: #4ade80; }
        .vp-field { margin-bottom: 14px; }
        .vp-label {
          font-size: 10px; font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 1.5px; text-transform: uppercase; color: #5a7060;
          display: block; margin-bottom: 6px;
        }
        .vp-input-wrap { position: relative; }
        .vp-input-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); color: #3a4e40; pointer-events: none;
        }
        .vp-input {
          width: 100%; background: #0a100c; border: 1px solid #1a2420;
          border-radius: 8px; padding: 11px 12px 11px 38px;
          font-size: 14px; font-family: 'IBM Plex Sans', sans-serif;
          color: #e2ece6; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .vp-input:focus {
          border-color: rgba(22,163,74,0.5);
          box-shadow: 0 0 0 3px rgba(22,163,74,0.08);
        }
        .vp-input::placeholder { color: #3a4e40; }
        .vp-input-right {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; color: #5a7060; cursor: pointer;
        }
        .vp-input-right:hover { color: #e2ece6; }
        .vp-otp-input {
          width: 100%; background: #0a100c; border: 1px solid #1a2420;
          border-radius: 8px; padding: 14px 16px;
          font-size: 28px; font-family: 'IBM Plex Mono', monospace;
          font-weight: 600; color: #4ade80; letter-spacing: 12px;
          text-align: center; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .vp-otp-input:focus {
          border-color: rgba(22,163,74,0.5);
          box-shadow: 0 0 0 3px rgba(22,163,74,0.08);
        }
        .vp-otp-input::placeholder { color: #1a2420; letter-spacing: 12px; }
        .vp-error {
          display: flex; align-items: flex-start; gap: 8px;
          background: rgba(255,71,87,0.06); border: 1px solid rgba(255,71,87,0.15);
          border-radius: 7px; padding: 10px 12px;
          font-size: 12px; color: #f87171; margin-bottom: 14px; line-height: 1.5;
        }
        .vp-btn {
          width: 100%; display: flex; align-items: center; justify-content: center;
          gap: 8px; background: #16a34a; color: white; border: none;
          border-radius: 8px; padding: 13px; font-size: 14px;
          font-family: 'IBM Plex Sans', sans-serif; font-weight: 600;
          cursor: pointer; transition: background 0.15s, box-shadow 0.15s;
          margin-top: 4px;
        }
        .vp-btn:hover { background: #15803d; box-shadow: 0 4px 16px rgba(22,163,74,0.25); }
        .vp-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
        .vp-resend {
          text-align: center; margin-top: 16px; font-size: 12px; color: #3a4e40;
        }
        .vp-resend-btn {
          background: none; border: none; color: #4ade80; cursor: pointer;
          font-size: 12px; font-family: 'IBM Plex Sans', sans-serif;
          text-decoration: underline; padding: 0;
        }
        .vp-resend-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .vp-resend-ok { color: #4ade80; }
        .vp-info {
          background: rgba(22,163,74,0.05); border: 1px solid rgba(22,163,74,0.12);
          border-radius: 8px; padding: 12px 14px;
          font-size: 12px; color: #5a7060; line-height: 1.6; margin-bottom: 16px;
        }
        .vp-info strong { color: #4ade80; font-weight: 500; }
        .vp-done { text-align: center; padding: 12px 0 4px; }
        .vp-done-icon {
          width: 56px; height: 56px; background: rgba(22,163,74,0.1);
          border: 1px solid rgba(22,163,74,0.25); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 18px;
        }
        .vp-done-title { font-size: 18px; font-weight: 600; color: #e2ece6; margin-bottom: 8px; }
        .vp-done-sub { font-size: 13px; color: #5a7060; line-height: 1.6; }
        .vp-footer {
          text-align: center; margin-top: 20px; font-size: 11px; color: #3a4e40;
        }
        .vp-footer a { color: #5a7060; text-decoration: none; }
        .vp-footer a:hover { color: #4ade80; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="vp-glow" />

      <div className="vp-card">
        {/* Logo */}
        <div className="vp-logo">
          <div className="vp-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7 12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z"/>
            </svg>
          </div>
          <span className="vp-logo-name">Attendy</span>
        </div>
        <div className="vp-school-tag">{schoolName}</div>

        <div className="vp-panel">
          {/* Steps */}
          <div className="vp-steps">
            {[
              { key: 'email', label: 'Email' },
              { key: 'otp', label: 'Verify' },
              { key: 'password', label: 'Password' },
              { key: 'done', label: 'Done' },
            ].map((s) => {
              const stageOrder = ['email', 'otp', 'password', 'done']
              const currentIdx = stageOrder.indexOf(stage)
              const thisIdx = stageOrder.indexOf(s.key)
              const status = thisIdx < currentIdx ? 'done' : thisIdx === currentIdx ? 'active' : ''
              return (
                <div key={s.key} className={`vp-step ${status}`}>
                  <div className="vp-step-dot" />
                  <span className="vp-step-label">{s.label}</span>
                </div>
              )
            })}
          </div>

          <div className="vp-body">
            {/* STAGE: EMAIL */}
            {stage === 'email' && (
              <>
                <div className="vp-icon-wrap"><Mail size={22} color="#4ade80" /></div>
                <div className="vp-title">Enter your email</div>
                <div className="vp-subtitle">
                  Your school admin has added you to <strong>{schoolName}</strong>.
                  Enter your work email to receive an 8-digit verification code.
                </div>
                <div className="vp-info">
                  <strong>Important:</strong> You must have been added by your school admin before using this page.
                  The code will appear in the email body — not as a link.
                </div>
                {error && (
                  <div className="vp-error">
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    {error}
                  </div>
                )}
                <div className="vp-field">
                  <label className="vp-label">Email Address</label>
                  <div className="vp-input-wrap">
                    <Mail className="vp-input-icon" size={14} />
                    <input
                      className="vp-input"
                      type="email"
                      placeholder="you@school.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
                      autoFocus
                      autoComplete="email"
                    />
                  </div>
                </div>
                <button
                  className="vp-btn"
                  onClick={handleEmailSubmit}
                  disabled={loading || !email.trim()}
                >
                  {loading
                    ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    : <ArrowRight size={16} />}
                  {loading ? 'Sending code...' : 'Send verification code'}
                </button>
              </>
            )}

            {/* STAGE: OTP */}
            {stage === 'otp' && (
              <>
                <div className="vp-icon-wrap"><ShieldCheck size={22} color="#4ade80" /></div>
                <div className="vp-title">Check your inbox</div>
                <div className="vp-subtitle">
                  We sent a <strong>8-digit code</strong> to <strong>{email}</strong>.
                  Enter it below — it expires in 1 hour.
                </div>
                <div className="vp-info">
                  Check your <strong>spam/junk folder</strong> if you don't see it.
                  The code is a plain number in the email body (not a link).
                  If the email shows a link instead of a number, ask your admin to update
                  the Supabase email template to use <strong>{`{{ .Token }}`}</strong>.
                </div>
                {error && (
                  <div className="vp-error">
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    {error}
                  </div>
                )}
                <div className="vp-field">
                  <label className="vp-label">8-digit code</label>
                  <input
                    className="vp-otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    placeholder="———————"
                    value={otp}
                    onChange={e => handleOtpChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && otp.length === 8 && handleOtpSubmit()}
                    autoFocus
                  />
                </div>
                <button
                  className="vp-btn"
                  onClick={handleOtpSubmit}
                  disabled={loading || otp.length < 8}
                >
                  {loading
                    ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    : <ShieldCheck size={16} />}
                  {loading ? 'Verifying...' : 'Verify code'}
                </button>
                <div className="vp-resend">
                  Didn't receive it?{' '}
                  {resendSuccess
                    ? <span className="vp-resend-ok">✓ New code sent!</span>
                    : (
                      <button
                        className="vp-resend-btn"
                        onClick={handleResendOtp}
                        disabled={resendLoading}
                      >
                        {resendLoading ? 'Sending...' : 'Resend code'}
                      </button>
                    )
                  }
                </div>
              </>
            )}

            {/* STAGE: PASSWORD */}
            {stage === 'password' && (
              <>
                <div className="vp-icon-wrap"><KeyRound size={22} color="#4ade80" /></div>
                <div className="vp-title">
                  Welcome{staffName ? `, ${staffName.split(' ')[0]}` : ''}! 👋
                </div>
                <div className="vp-subtitle">
                  You've been verified as staff at <strong>{schoolInfo?.name ?? schoolName}</strong>.
                  Set a password to complete your account setup.
                </div>
                {error && (
                  <div className="vp-error">
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    {error}
                  </div>
                )}
                <div className="vp-field">
                  <label className="vp-label">New Password</label>
                  <div className="vp-input-wrap">
                    <KeyRound className="vp-input-icon" size={14} />
                    <input
                      className="vp-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button className="vp-input-right" type="button" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="vp-field">
                  <label className="vp-label">Confirm Password</label>
                  <div className="vp-input-wrap">
                    <KeyRound className="vp-input-icon" size={14} />
                    <input
                      className="vp-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                      onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <button
                  className="vp-btn"
                  onClick={handlePasswordSubmit}
                  disabled={loading || !password || !confirmPassword}
                >
                  {loading
                    ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    : <ShieldCheck size={16} />}
                  {loading ? 'Setting password...' : 'Set password & continue'}
                </button>
              </>
            )}

            {/* STAGE: DONE */}
            {stage === 'done' && (
              <div className="vp-done">
                <div className="vp-done-icon">
                  <CheckCircle2 size={26} color="#4ade80" />
                </div>
                <div className="vp-done-title">You're all set!</div>
                <div className="vp-done-sub">
                  Your account is ready. Redirecting you to your dashboard…
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="vp-footer">
          Already set up your account?{' '}
          <a href={`/${school_slug}/login`}>Sign in here →</a>
        </div>
      </div>
    </div>
  )
}