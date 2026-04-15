'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function ParentLoginPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Normalise Nigerian phone numbers
  function normalisePhone(raw: string): string {
    let p = raw.replace(/[\s\-().+]/g, '')
    if (p.startsWith('0') && p.length === 11) p = '234' + p.slice(1)
    if (p.startsWith('234') && p.length === 13) return p
    return ''
  }

  async function handleLogin() {
    setError('')
    const normalised = normalisePhone(phone)
    if (!normalised) { setError('Enter a valid Nigerian phone number — e.g. 08012345678'); return }

    setLoading(true)

    const res = await fetch('/api/parent-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalised, school_slug }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.message ?? 'Login failed. Check your number or contact the school admin.')
      setLoading(false)
      return
    }

    // Store session token in localStorage and redirect
    localStorage.setItem('parent_token', data.token)
    localStorage.setItem('parent_school', school_slug)
    router.push(`/${school_slug}/parent/my-child`)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #080c0a; --surface: #0d1410;
          --border: #1a2420; --border2: #243028;
          --green: #00e676; --green-dim: rgba(0,230,118,0.08);
          --green-text: #4ade80; --text: #e2ece6;
          --muted: #5a7060; --muted2: #3a4e40;
          --red: #ff4757; --red-dim: rgba(255,71,87,0.06);
          --mono: 'IBM Plex Mono', monospace;
          --sans: 'IBM Plex Sans', sans-serif;
        }
        html, body { background: var(--bg); height: 100%; }

        .root {
          min-height: 100vh; background: var(--bg);
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem; font-family: var(--sans);
          position: relative; overflow: hidden;
        }

        .root::before {
          content: ''; position: fixed; inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px);
          pointer-events: none;
        }

        .glow {
          position: fixed; top: -150px; left: 50%; transform: translateX(-50%);
          width: 500px; height: 400px;
          background: radial-gradient(ellipse, rgba(22,163,74,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .card {
          width: 100%; max-width: 380px; z-index: 1;
          animation: rise 0.4s cubic-bezier(0.22,0.68,0,1.2);
        }
        @keyframes rise { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .brand {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; margin-bottom: 28px;
        }

        .brand-logo {
          width: 46px; height: 46px; background: #16a34a; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 28px rgba(22,163,74,0.4), 0 0 60px rgba(22,163,74,0.12);
        }

        .brand-name { font-size: 20px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
        .brand-role {
          font-size: 11px; font-family: var(--mono);
          color: var(--green-text); letter-spacing: 1px;
          background: var(--green-dim); border: 1px solid rgba(0,230,118,0.15);
          padding: 3px 12px; border-radius: 20px; text-transform: uppercase;
        }

        .panel {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; overflow: hidden;
        }

        .panel-header {
          padding: 20px 24px 0;
        }

        .panel-title { font-size: 17px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
        .panel-sub { font-size: 13px; color: var(--muted); line-height: 1.6; margin-bottom: 20px; }

        .panel-body { padding: 0 24px 24px; }

        .field-label {
          display: block; font-size: 10px; font-family: var(--mono);
          letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--muted); margin-bottom: 8px;
        }

        .phone-input-wrap {
          display: flex; align-items: center;
          background: #0a100c; border: 1px solid var(--border);
          border-radius: 8px; overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
          margin-bottom: 14px;
        }
        .phone-input-wrap:focus-within {
          border-color: rgba(22,163,74,0.45);
          box-shadow: 0 0 0 3px rgba(22,163,74,0.08);
        }

        .phone-prefix {
          padding: 0 12px; height: 46px;
          display: flex; align-items: center;
          font-size: 14px; font-family: var(--mono); color: var(--muted);
          border-right: 1px solid var(--border);
          background: rgba(255,255,255,0.02);
          white-space: nowrap;
        }

        .phone-input {
          flex: 1; background: transparent; border: none; outline: none;
          padding: 0 14px; height: 46px;
          font-size: 16px; font-family: var(--mono);
          color: var(--text); letter-spacing: 1px;
        }
        .phone-input::placeholder { color: var(--muted2); letter-spacing: 1px; }

        .error-box {
          display: flex; align-items: flex-start; gap: 8px;
          background: var(--red-dim); border: 1px solid rgba(255,71,87,0.15);
          border-radius: 7px; padding: 10px 12px;
          font-size: 12px; color: #f87171; margin-bottom: 12px; line-height: 1.5;
        }

        .info-box {
          background: var(--green-dim); border: 1px solid rgba(0,230,118,0.1);
          border-radius: 7px; padding: 10px 13px;
          font-size: 12px; color: var(--muted); line-height: 1.65;
          margin-bottom: 16px;
        }
        .info-box strong { color: var(--green-text); font-weight: 500; }

        .login-btn {
          width: 100%; background: #16a34a; color: white; border: none;
          border-radius: 8px; padding: 13px;
          font-size: 14px; font-family: var(--sans); font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
        }
        .login-btn:hover { background: #15803d; box-shadow: 0 4px 18px rgba(22,163,74,0.28); }
        .login-btn:active { transform: scale(0.99); }
        .login-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }

        .footer { text-align: center; margin-top: 16px; font-size: 12px; color: var(--muted2); font-family: var(--mono); }
        .school-name { color: var(--muted); text-transform: capitalize; }

        .divider { height: 1px; background: var(--border); margin: 0 24px 20px; }
      `}</style>

      <div className="root">
        <div className="glow" />
        <div className="card">
          <div className="brand">
            <div className="brand-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7 12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z"/>
              </svg>
            </div>
            <div className="brand-name">Attendy</div>
            <div className="brand-role">Parent Portal</div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">View your child's attendance</div>
              <p className="panel-sub">Enter the phone number you gave the school when registering your child.</p>
            </div>
            <div className="divider" />
            <div className="panel-body">
              <div className="info-box">
                📱 No password needed — just your <strong>registered phone number</strong>. You'll get instant access to your child's arrival records.
              </div>

              <label className="field-label">Your phone number</label>
              <div className="phone-input-wrap">
                <div className="phone-prefix">🇳🇬 +234</div>
                <input
                  className="phone-input"
                  type="tel"
                  inputMode="numeric"
                  placeholder="08012345678"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  autoFocus
                />
              </div>

              {error && (
                <div className="error-box">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <button className="login-btn" onClick={handleLogin} disabled={loading || !phone.trim()}>
                {loading ? <span className="spinner" /> : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                )}
                {loading ? 'Checking...' : 'View my child\'s attendance'}
              </button>
            </div>
          </div>

          <div className="footer">
            <span className="school-name">{school_slug?.replace(/-/g, ' ')}</span>
            {' · '}
            <a href={`/${school_slug}/login`} style={{ color: '#3a4e40', textDecoration: 'none' }}>
              Staff login →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}