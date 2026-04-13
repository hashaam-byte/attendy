'use client'
import { useEffect, useState } from 'react'

type PageState = 'loading' | 'sealed' | 'open' | 'done'

export default function SetupPage() {
  const [state, setState] = useState<PageState>('loading')
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    fetch('/api/setup/status')
      .then(r => r.json())
      .then(d => setState(d.exists ? 'sealed' : 'open'))
      .catch(() => setState('sealed'))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.full_name || !form.email || !form.password) {
      setError('All fields are required.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 12) {
      setError('Password must be at least 12 characters.')
      return
    }

    setSubmitting(true)

    const res = await fetch('/api/setup/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.message ?? 'Something went wrong.')
      setSubmitting(false)
      return
    }

    setState('done')
    setSubmitting(false)
  }

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #070808;
      --surface: #0e1010;
      --border: #1e2424;
      --border-bright: #2e3838;
      --green: #00ff88;
      --green-dim: rgba(0,255,136,0.08);
      --green-glow: rgba(0,255,136,0.15);
      --red: #ff4444;
      --red-dim: rgba(255,68,68,0.08);
      --text: #e8edeb;
      --muted: #5a6e68;
      --muted2: #3a4a44;
      --mono: 'IBM Plex Mono', monospace;
      --sans: 'IBM Plex Sans', sans-serif;
    }

    html, body { height: 100%; background: var(--bg); }

    .root {
      min-height: 100vh;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      font-family: var(--mono);
      position: relative;
      overflow: hidden;
    }

    /* Scanline effect */
    .root::before {
      content: '';
      position: fixed;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0,0,0,0.03) 2px,
        rgba(0,0,0,0.03) 4px
      );
      pointer-events: none;
      z-index: 100;
    }

    /* Corner marks */
    .corner {
      position: fixed;
      width: 20px; height: 20px;
      border-color: var(--border-bright);
      border-style: solid;
      opacity: 0.5;
    }
    .corner-tl { top: 24px; left: 24px; border-width: 1px 0 0 1px; }
    .corner-tr { top: 24px; right: 24px; border-width: 1px 1px 0 0; }
    .corner-bl { bottom: 24px; left: 24px; border-width: 0 0 1px 1px; }
    .corner-br { bottom: 24px; right: 24px; border-width: 0 1px 1px 0; }

    /* Status line at top */
    .status-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: var(--border);
      z-index: 10;
    }
    .status-bar-fill {
      height: 100%;
      transition: width 0.8s ease, background 0.5s;
    }

    /* Main card */
    .card {
      width: 100%;
      max-width: 440px;
      animation: appear 0.4s ease both;
    }

    @keyframes appear {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .header {
      margin-bottom: 36px;
    }

    .sys-label {
      font-size: 10px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sys-label::before {
      content: '';
      width: 20px; height: 1px;
      background: var(--muted2);
    }

    .title {
      font-size: 22px;
      font-weight: 600;
      color: var(--text);
      letter-spacing: -0.5px;
      line-height: 1.3;
      margin-bottom: 8px;
    }

    .subtitle {
      font-size: 12px;
      color: var(--muted);
      font-weight: 300;
      line-height: 1.7;
      font-family: var(--sans);
    }

    /* Form */
    .form { display: flex; flex-direction: column; gap: 14px; }

    .field { display: flex; flex-direction: column; gap: 6px; }

    .label {
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--muted);
    }

    .input-wrap { position: relative; }

    .input {
      width: 100%;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 12px 14px;
      font-size: 14px;
      font-family: var(--mono);
      color: var(--text);
      outline: none;
      transition: border-color 0.2s;
      letter-spacing: 0.3px;
    }
    .input:focus {
      border-color: var(--green);
      box-shadow: 0 0 0 3px var(--green-dim);
    }
    .input::placeholder { color: var(--muted2); }

    .input-pw { padding-right: 44px; }

    .pw-toggle {
      position: absolute;
      right: 12px; top: 50%;
      transform: translateY(-50%);
      background: none; border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 10px;
      letter-spacing: 1px;
      font-family: var(--mono);
      text-transform: uppercase;
    }
    .pw-toggle:hover { color: var(--text); }

    .hint {
      font-size: 10px;
      color: var(--muted2);
      font-family: var(--sans);
    }

    /* Error */
    .error-box {
      background: var(--red-dim);
      border: 1px solid rgba(255,68,68,0.2);
      border-radius: 4px;
      padding: 10px 14px;
      font-size: 12px;
      color: var(--red);
      font-family: var(--sans);
    }

    /* Submit button */
    .btn {
      margin-top: 4px;
      background: var(--green);
      color: #000;
      border: none;
      border-radius: 4px;
      padding: 14px;
      font-size: 12px;
      font-family: var(--mono);
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
      width: 100%;
    }
    .btn:hover { opacity: 0.88; }
    .btn:active { transform: scale(0.99); }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Warning */
    .warning {
      margin-top: 16px;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 11px;
      color: var(--muted);
      font-family: var(--sans);
      line-height: 1.6;
    }
    .warning strong { color: rgba(255,200,0,0.7); font-weight: 500; }

    /* SEALED STATE */
    .sealed {
      text-align: center;
      animation: appear 0.6s ease both;
    }

    .seal-icon {
      width: 64px; height: 64px;
      border: 1px solid var(--border-bright);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 28px;
      position: relative;
    }
    .seal-icon::after {
      content: '';
      position: absolute;
      inset: -6px;
      border: 1px solid var(--border);
      border-radius: 50%;
      opacity: 0.5;
    }

    .sealed-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--muted);
      letter-spacing: 1px;
      margin-bottom: 12px;
      text-transform: uppercase;
    }

    .sealed-sub {
      font-size: 12px;
      color: var(--muted2);
      font-family: var(--sans);
      line-height: 1.7;
      max-width: 300px;
      margin: 0 auto 28px;
    }

    .sealed-code {
      font-size: 10px;
      letter-spacing: 3px;
      color: var(--muted2);
      text-transform: uppercase;
      border: 1px solid var(--border);
      display: inline-block;
      padding: 6px 16px;
      border-radius: 2px;
    }

    /* DONE STATE */
    .done-icon {
      width: 56px; height: 56px;
      background: var(--green-dim);
      border: 1px solid rgba(0,255,136,0.25);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
    }

    .done-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--green);
      margin-bottom: 10px;
      letter-spacing: -0.3px;
    }

    .done-sub {
      font-size: 12px;
      color: var(--muted);
      font-family: var(--sans);
      line-height: 1.7;
      max-width: 320px;
      margin: 0 auto 28px;
    }

    .login-link {
      display: inline-block;
      padding: 10px 24px;
      border: 1px solid var(--border-bright);
      border-radius: 4px;
      font-size: 11px;
      font-family: var(--mono);
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--text);
      text-decoration: none;
      transition: border-color 0.2s, color 0.2s;
    }
    .login-link:hover { border-color: var(--green); color: var(--green); }

    /* LOADING */
    .loading {
      font-size: 11px;
      color: var(--muted2);
      letter-spacing: 3px;
      text-transform: uppercase;
      text-align: center;
      animation: blink 1.2s ease infinite;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    /* Bottom coordinates */
    .coords {
      position: fixed;
      bottom: 28px;
      right: 28px;
      font-size: 9px;
      letter-spacing: 2px;
      color: var(--muted2);
      text-align: right;
      line-height: 1.8;
    }
  `

  const statusFill = {
    loading: { width: '20%', background: 'var(--muted2)' },
    open:    { width: '50%', background: 'var(--green)' },
    done:    { width: '100%', background: 'var(--green)' },
    sealed:  { width: '100%', background: 'var(--red)' },
  }

  return (
    <>
      <style>{styles}</style>
      <div className="root">
        {/* Status bar */}
        <div className="status-bar">
          <div className="status-bar-fill" style={statusFill[state]} />
        </div>

        {/* Corner marks */}
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />

        {/* LOADING */}
        {state === 'loading' && (
          <div className="loading">Checking system status...</div>
        )}

        {/* SEALED — head admin already exists */}
        {state === 'sealed' && (
          <div className="sealed">
            <div className="seal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3a4a44" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <div className="sealed-title">Access Sealed</div>
            <div className="sealed-sub">
              A head administrator account already exists. This setup page is permanently locked and cannot be accessed again.
            </div>
            <div className="sealed-code">STATUS · LOCKED</div>
          </div>
        )}

        {/* OPEN — no head admin yet */}
        {state === 'open' && (
          <div className="card">
            <div className="header">
              <div className="sys-label">System Initialization</div>
              <div className="title">Create Head Administrator</div>
              <div className="subtitle">
                This page exists exactly once. After an account is created, this URL will be permanently sealed. Proceed carefully.
              </div>
            </div>

            <form className="form" onSubmit={handleSubmit}>
              <div className="field">
                <label className="label">Full Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Adaeze Okafor"
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  autoComplete="off"
                />
              </div>

              <div className="field">
                <label className="label">Email Address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="admin@attendy.ng"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  autoComplete="off"
                />
              </div>

              <div className="field">
                <label className="label">Password</label>
                <div className="input-wrap">
                  <input
                    className="input input-pw"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 12 characters"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? 'hide' : 'show'}
                  </button>
                </div>
                <span className="hint">Minimum 12 characters. Use something strong.</span>
              </div>

              <div className="field">
                <label className="label">Confirm Password</label>
                <input
                  className="input input-pw"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={form.confirm}
                  onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>

              {error && <div className="error-box">{error}</div>}

              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Initialize Head Admin →'}
              </button>
            </form>

            <div className="warning">
              <strong>⚠ One-time action.</strong> Once submitted, this page locks permanently. There is no "create another" — if you lose access, you must delete the record directly from the database.
            </div>
          </div>
        )}

        {/* DONE — just created */}
        {state === 'done' && (
          <div className="sealed" style={{ textAlign: 'center' }}>
            <div className="done-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div className="done-title">Head Admin Created</div>
            <div className="done-sub">
              The account has been created and this setup page is now permanently sealed. Bookmark your admin login URL before leaving.
            </div>
            <a className="login-link" href="/head-admin/login">
              Go to Admin Login →
            </a>
          </div>
        )}

        {/* Bottom coords */}
        <div className="coords">
          ATTENDY · SETUP<br />
          {state.toUpperCase()}
        </div>
      </div>
    </>
  )
}
