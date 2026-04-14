'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type CheckStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'suspended' | 'invalid' | 'error'

interface SchoolResult {
  name: string
  slug: string
  is_active: boolean
  plan: string
  registered: number | null
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
    --green-border: rgba(0,255,136,0.2);
    --red: #ff4466;
    --red-dim: rgba(255,68,102,0.08);
    --amber: #ffaa00;
    --amber-dim: rgba(255,170,0,0.08);
    --text: #e8edeb;
    --muted: #5a6e68;
    --muted2: #3a4a44;
    --mono: 'IBM Plex Mono', monospace;
    --sans: 'IBM Plex Sans', sans-serif;
  }

  html, body { height: 100%; background: var(--bg); }

  .status-root {
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

  .status-root::before {
    content: '';
    position: fixed; inset: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px,
      rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px
    );
    pointer-events: none; z-index: 0;
  }

  .corner {
    position: fixed;
    width: 20px; height: 20px;
    border-color: var(--border-bright);
    border-style: solid; opacity: 0.4;
  }
  .corner-tl { top: 24px; left: 24px; border-width: 1px 0 0 1px; }
  .corner-tr { top: 24px; right: 24px; border-width: 1px 1px 0 0; }
  .corner-bl { bottom: 24px; left: 24px; border-width: 0 0 1px 1px; }
  .corner-br { bottom: 24px; right: 24px; border-width: 0 1px 1px 0; }

  .status-bar {
    position: fixed; top: 0; left: 0; right: 0; height: 2px;
    background: var(--border); z-index: 10;
  }
  .status-bar-fill {
    height: 100%; width: 100%;
    background: var(--green); opacity: 0.6;
  }

  .card {
    width: 100%; max-width: 480px;
    position: relative; z-index: 1;
    animation: appear 0.4s ease both;
  }

  @keyframes appear {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .header { margin-bottom: 32px; }

  .logo {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none; margin-bottom: 24px;
  }
  .logo-icon {
    width: 30px; height: 30px;
    background: #16a34a; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
  }
  .logo-text { font-size: 15px; font-weight: 600; color: var(--text); }

  .sys-label {
    font-size: 10px; letter-spacing: 3px;
    text-transform: uppercase; color: var(--muted);
    margin-bottom: 12px;
    display: flex; align-items: center; gap: 10px;
  }
  .sys-label::before {
    content: ''; width: 20px; height: 1px;
    background: var(--muted2);
  }

  .title {
    font-size: 20px; font-weight: 600;
    color: var(--text); letter-spacing: -0.5px;
    line-height: 1.3; margin-bottom: 6px;
  }

  .subtitle {
    font-size: 12px; color: var(--muted);
    font-weight: 300; line-height: 1.7;
    font-family: var(--sans);
  }

  .search-wrap {
    display: flex; gap: 10px; margin-bottom: 24px;
  }

  .input-group {
    flex: 1;
    display: flex; align-items: center;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0 12px;
    transition: border-color 0.2s;
  }
  .input-group:focus-within {
    border-color: var(--green);
    box-shadow: 0 0 0 3px var(--green-dim);
  }
  .input-prefix {
    font-size: 11px; color: var(--muted2);
    white-space: nowrap; font-family: var(--mono);
    padding-right: 2px;
  }
  .slug-input {
    flex: 1; min-width: 0;
    background: transparent; border: none;
    padding: 12px 0;
    font-size: 14px; font-family: var(--mono);
    color: var(--text); outline: none;
    letter-spacing: 0.3px;
  }
  .slug-input::placeholder { color: var(--muted2); }

  .check-btn {
    background: var(--green);
    color: #000; border: none;
    border-radius: 6px;
    padding: 0 20px;
    font-size: 12px; font-family: var(--mono);
    font-weight: 600; letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer; white-space: nowrap;
    transition: opacity 0.15s, transform 0.1s;
  }
  .check-btn:hover { opacity: 0.88; }
  .check-btn:active { transform: scale(0.98); }
  .check-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* Result card */
  .result {
    border-radius: 6px;
    padding: 20px;
    animation: fadeIn 0.3s ease;
    margin-bottom: 20px;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .result-found {
    background: var(--green-dim);
    border: 1px solid var(--green-border);
  }
  .result-notfound {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-bright);
  }
  .result-suspended {
    background: var(--amber-dim);
    border: 1px solid rgba(255,170,0,0.2);
  }
  .result-error {
    background: var(--red-dim);
    border: 1px solid rgba(255,68,102,0.2);
  }

  .result-header {
    display: flex; align-items: center;
    gap: 10px; margin-bottom: 12px;
  }
  .status-dot {
    width: 8px; height: 8px;
    border-radius: 50%; flex-shrink: 0;
  }
  .dot-green { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .dot-red { background: var(--red); }
  .dot-amber { background: var(--amber); }
  .dot-muted { background: var(--muted2); }

  .result-status {
    font-size: 11px; letter-spacing: 2px;
    text-transform: uppercase;
  }
  .text-green { color: var(--green); }
  .text-red { color: var(--red); }
  .text-amber { color: var(--amber); }
  .text-muted { color: var(--muted); }

  .result-name {
    font-size: 16px; font-weight: 600;
    color: var(--text); margin-bottom: 12px;
    letter-spacing: -0.3px;
  }

  .result-rows { display: flex; flex-direction: column; gap: 6px; }
  .result-row {
    display: flex; align-items: center;
    justify-content: space-between;
    font-size: 11px;
  }
  .result-row-label { color: var(--muted); }
  .result-row-value { color: var(--text); font-weight: 500; }

  .result-divider {
    height: 1px; background: rgba(255,255,255,0.05);
    margin: 14px 0;
  }

  .login-btn {
    display: block; width: 100%;
    background: var(--green); color: #000;
    text-decoration: none; text-align: center;
    font-size: 12px; font-family: var(--mono);
    font-weight: 600; letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 12px; border-radius: 4px;
    transition: opacity 0.15s;
    cursor: pointer; border: none;
  }
  .login-btn:hover { opacity: 0.88; }

  .recent-section { margin-top: 20px; }
  .recent-label {
    font-size: 10px; letter-spacing: 2px;
    color: var(--muted2); text-transform: uppercase;
    margin-bottom: 8px;
  }
  .recent-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .recent-chip {
    font-size: 11px; font-family: var(--mono);
    color: var(--muted);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px 10px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .recent-chip:hover { color: var(--text); border-color: var(--border-bright); }

  .footer-links {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 24px;
    font-size: 10px; color: var(--muted2);
    letter-spacing: 1px;
  }
  .footer-link {
    color: var(--muted2); text-decoration: none;
    transition: color 0.15s;
    font-family: var(--mono);
  }
  .footer-link:hover { color: var(--muted); }

  .loading-dots {
    display: flex; gap: 4px; align-items: center;
  }
  .loading-dots span {
    width: 4px; height: 4px;
    background: var(--green);
    border-radius: 50%;
    animation: bounce 1.2s ease infinite;
  }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(1); opacity: 0.4; }
    40% { transform: scale(1.3); opacity: 1; }
  }

  @media (max-width: 480px) {
    .status-root { padding: 1.5rem 1rem; }
    .input-prefix { display: none; }
  }
`

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  standard: 'Standard',
  pro: 'Pro',
}

export default function SchoolStatusPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [slug, setSlug] = useState('')
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle')
  const [result, setResult] = useState<SchoolResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [history, setHistory] = useState<string[]>([])

  async function checkSchool(slugToCheck?: string) {
    const s = (slugToCheck ?? slug).trim().toLowerCase().replace(/\s+/g, '-')
    if (!s) return

    setCheckStatus('loading')
    setResult(null)
    setErrorMsg('')

    try {
      const res = await fetch(`/api/school-status?slug=${encodeURIComponent(s)}`)
      const data = await res.json()

      if (!res.ok) {
        setCheckStatus('error')
        setErrorMsg(data.error ?? 'Server error')
        return
      }

      if (data.status === 'invalid') {
        setCheckStatus('invalid')
        return
      }

      if (!data.found) {
        setCheckStatus('not_found')
        return
      }

      setResult(data.school)
      setCheckStatus(data.status === 'active' ? 'found' : 'suspended')

      // Add to history
      setHistory(prev => {
        const next = [s, ...prev.filter(x => x !== s)].slice(0, 5)
        return next
      })
    } catch (err) {
      setCheckStatus('error')
      setErrorMsg('Network error — check your connection.')
    }
  }

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    checkSchool()
  }

  return (
    <>
      <style>{styles}</style>
      <div className="status-root">
        <div className="status-bar"><div className="status-bar-fill" /></div>
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />

        <div className="card">
          <div className="header">
            <a href="/" className="logo">
              <div className="logo-icon">
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24" style={{width:16,height:16}}>
                  <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7 12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z"/>
                </svg>
              </div>
              <span className="logo-text">Attendy</span>
            </a>

            <div className="sys-label">School Registry</div>
            <div className="title">Check School Status</div>
            <div className="subtitle">
              Enter a school slug to verify if it's registered on Attendy,
              active, and ready to log in.
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="search-wrap">
              <div className="input-group">
                <span className="input-prefix">attendy-edu.vercel.app/</span>
                <input
                  ref={inputRef}
                  className="slug-input"
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="your-school-slug"
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="none"
                />
              </div>
              <button
                type="submit"
                className="check-btn"
                disabled={!slug.trim() || checkStatus === 'loading'}
              >
                {checkStatus === 'loading' ? (
                  <span style={{display:'flex',alignItems:'center',gap:6}}>
                    <span className="loading-dots">
                      <span/><span/><span/>
                    </span>
                  </span>
                ) : 'Check'}
              </button>
            </div>
          </form>

          {/* Results */}
          {checkStatus === 'found' && result && (
            <div className="result result-found">
              <div className="result-header">
                <span className="status-dot dot-green" />
                <span className="result-status text-green">Active · Registered</span>
              </div>
              <div className="result-name">{result.name}</div>
              <div className="result-rows">
                <div className="result-row">
                  <span className="result-row-label">Slug</span>
                  <span className="result-row-value">/{result.slug}</span>
                </div>
                <div className="result-row">
                  <span className="result-row-label">Plan</span>
                  <span className="result-row-value">{PLAN_LABELS[result.plan] ?? result.plan}</span>
                </div>
                {result.registered && (
                  <div className="result-row">
                    <span className="result-row-label">Member since</span>
                    <span className="result-row-value">{result.registered}</span>
                  </div>
                )}
              </div>
              <div className="result-divider" />
              <button
                className="login-btn"
                onClick={() => router.push(`/${result.slug}/login`)}
              >
                Go to login →
              </button>
            </div>
          )}

          {checkStatus === 'suspended' && result && (
            <div className="result result-suspended">
              <div className="result-header">
                <span className="status-dot dot-amber" />
                <span className="result-status text-amber">Suspended</span>
              </div>
              <div className="result-name">{result.name}</div>
              <div className="result-rows">
                <div className="result-row">
                  <span className="result-row-label">Status</span>
                  <span className="result-row-value" style={{color:'var(--amber)'}}>Account suspended</span>
                </div>
              </div>
              <div className="result-divider" />
              <p style={{fontSize:11,color:'var(--muted)',fontFamily:'var(--sans)',lineHeight:1.6}}>
                This school's account has been temporarily suspended. Contact your school
                administrator or{' '}
                <a href="mailto:attendyofficial@gmail.com" style={{color:'var(--green)',textDecoration:'none'}}>
                  Attendy support
                </a>.
              </p>
            </div>
          )}

          {checkStatus === 'not_found' && (
            <div className="result result-notfound">
              <div className="result-header">
                <span className="status-dot dot-muted" />
                <span className="result-status text-muted">Not Found</span>
              </div>
              <p style={{fontSize:13,color:'var(--muted)',fontFamily:'var(--sans)',lineHeight:1.6,marginBottom:12}}>
                No school found with slug <code style={{color:'var(--text)',fontSize:12}}>/{slug}</code>.
                Double-check the spelling or contact your school admin for the correct link.
              </p>
              <p style={{fontSize:11,color:'var(--muted2)',fontFamily:'var(--sans)'}}>
                School slugs are lowercase with hyphens — e.g.{' '}
                <code style={{color:'var(--muted)'}}>kings-college-lagos</code>
              </p>
            </div>
          )}

          {checkStatus === 'invalid' && (
            <div className="result result-error">
              <div className="result-header">
                <span className="status-dot dot-red" />
                <span className="result-status text-red">Invalid Format</span>
              </div>
              <p style={{fontSize:12,color:'var(--muted)',fontFamily:'var(--sans)',lineHeight:1.6}}>
                School slugs use only lowercase letters, numbers, and hyphens.
                No spaces, uppercase, or special characters.
              </p>
            </div>
          )}

          {checkStatus === 'error' && (
            <div className="result result-error">
              <div className="result-header">
                <span className="status-dot dot-red" />
                <span className="result-status text-red">Error</span>
              </div>
              <p style={{fontSize:12,color:'var(--muted)',fontFamily:'var(--sans)',lineHeight:1.6,marginBottom:8}}>
                {errorMsg || 'Something went wrong. Please try again.'}
              </p>
              <button
                style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--green)',background:'none',border:'none',cursor:'pointer',padding:0,letterSpacing:1}}
                onClick={() => checkSchool()}
              >
                RETRY →
              </button>
            </div>
          )}

          {/* Recent checks */}
          {history.length > 0 && checkStatus !== 'loading' && (
            <div className="recent-section">
              <div className="recent-label">Recent checks</div>
              <div className="recent-list">
                {history.map(h => (
                  <button
                    key={h}
                    className="recent-chip"
                    onClick={() => {
                      setSlug(h)
                      checkSchool(h)
                    }}
                  >
                    /{h}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="footer-links">
            <a href="/" className="footer-link">← ATTENDY HOME</a>
            <a href="/head-admin/login" className="footer-link">HEAD ADMIN</a>
          </div>
        </div>
      </div>
    </>
  )
}
