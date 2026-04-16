'use client'
// src/app/termii-test/page.tsx
// STANDALONE DEBUG PAGE — not linked from any nav. Remove before production.

import { useState } from 'react'

type Status = 'idle' | 'sending' | 'success' | 'error'

interface DebugResult {
  success: boolean
  message?: string
  message_id?: string
  channel_used?: string
  error?: string
  stage?: string
  diagnosis?: string[]
  debug?: Record<string, unknown>
}

export default function TermiiTestPage() {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('Attendy test: SMS is working correctly ✓')
  const [channel, setChannel] = useState<'generic' | 'dnd'>('generic')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<DebugResult | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  async function handleSend() {
    if (!phone.trim() || !message.trim()) return
    setStatus('sending')
    setResult(null)
    setShowRaw(false)

    try {
      const res = await fetch('/api/termii-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), message: message.trim(), channel }),
      })
      const data: DebugResult = await res.json()
      setResult(data)
      setStatus(data.success ? 'success' : 'error')
    } catch (err) {
      setResult({
        success: false,
        error: 'Failed to reach the test API. Is your Next.js server running?',
        stage: 'network',
        diagnosis: ['❌ Could not reach /api/termii-test — check your server is running'],
      })
      setStatus('error')
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Sora:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0a0b0f;
          --panel: #111318;
          --panel2: #16181f;
          --border: #1e2130;
          --border2: #252838;
          --accent: #7c6aff;
          --accent-dim: rgba(124,106,255,0.1);
          --accent-border: rgba(124,106,255,0.25);
          --green: #00e5a0;
          --green-dim: rgba(0,229,160,0.08);
          --green-border: rgba(0,229,160,0.2);
          --red: #ff4d6a;
          --red-dim: rgba(255,77,106,0.08);
          --red-border: rgba(255,77,106,0.2);
          --yellow: #f5c542;
          --text: #e8eaf2;
          --muted: #6b7080;
          --muted2: #3e4255;
          --mono: 'JetBrains Mono', monospace;
          --sans: 'Sora', sans-serif;
        }

        html, body {
          height: 100%;
          background: var(--bg);
          font-family: var(--sans);
          color: var(--text);
          -webkit-font-smoothing: antialiased;
        }

        .page {
          min-height: 100vh;
          background: var(--bg);
          padding: 0;
          position: relative;
          overflow: hidden;
        }

        /* Background grid */
        .page::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(124,106,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,106,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }

        /* Top glow */
        .page::after {
          content: '';
          position: fixed;
          top: -200px; left: 50%; transform: translateX(-50%);
          width: 800px; height: 500px;
          background: radial-gradient(ellipse, rgba(124,106,255,0.1) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        .inner {
          position: relative; z-index: 1;
          max-width: 640px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }

        /* Header */
        .header {
          margin-bottom: 36px;
        }

        .dev-badge {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(245,197,66,0.08);
          border: 1px solid rgba(245,197,66,0.2);
          color: var(--yellow);
          font-size: 10px; font-family: var(--mono);
          letter-spacing: 2px; text-transform: uppercase;
          padding: 5px 12px; border-radius: 4px;
          margin-bottom: 20px;
        }

        .dev-badge-dot {
          width: 5px; height: 5px;
          border-radius: 50%; background: var(--yellow);
        }

        h1 {
          font-size: 28px; font-weight: 700;
          letter-spacing: -0.8px; line-height: 1.1;
          color: var(--text); margin-bottom: 8px;
        }

        .subtitle {
          font-size: 14px; color: var(--muted);
          line-height: 1.6; font-weight: 300;
        }

        /* Card */
        .card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .card-header {
          padding: 14px 20px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 9px;
        }

        .card-header-icon {
          width: 26px; height: 26px;
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .card-title {
          font-size: 11px; font-family: var(--mono);
          font-weight: 600; letter-spacing: 1px;
          text-transform: uppercase; color: var(--text);
        }

        .card-body { padding: 20px; }

        /* Fields */
        .field { margin-bottom: 16px; }
        .field:last-child { margin-bottom: 0; }

        .label {
          display: block;
          font-size: 10px; font-family: var(--mono);
          letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--muted); margin-bottom: 7px;
        }

        .input {
          width: 100%;
          background: var(--panel2);
          border: 1px solid var(--border2);
          border-radius: 8px;
          padding: 11px 14px;
          font-size: 14px; font-family: var(--mono);
          color: var(--text); outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input:focus {
          border-color: var(--accent-border);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }
        .input::placeholder { color: var(--muted2); }

        textarea.input {
          resize: vertical; min-height: 80px;
          font-size: 13px; line-height: 1.6;
        }

        /* Channel select */
        .channel-row {
          display: flex; gap: 8px;
        }

        .channel-btn {
          flex: 1; padding: 10px;
          border-radius: 8px; cursor: pointer;
          font-size: 12px; font-family: var(--mono);
          letter-spacing: 0.5px; text-transform: uppercase;
          border: 1px solid var(--border2);
          background: var(--panel2);
          color: var(--muted);
          transition: all 0.15s;
          display: flex; flex-direction: column;
          align-items: center; gap: 4px;
        }
        .channel-btn span { font-size: 10px; color: var(--muted2); font-weight: 300; letter-spacing: 0; text-transform: none; }
        .channel-btn.active {
          background: var(--accent-dim);
          border-color: var(--accent-border);
          color: #a89aff;
        }
        .channel-btn:hover:not(.active) {
          border-color: var(--border);
          color: var(--text);
        }

        /* Send button */
        .send-btn {
          width: 100%; padding: 14px;
          background: var(--accent);
          color: white; border: none;
          border-radius: 10px;
          font-size: 14px; font-family: var(--sans);
          font-weight: 600; cursor: pointer;
          display: flex; align-items: center;
          justify-content: center; gap: 9px;
          transition: all 0.15s;
          margin-top: 20px;
          letter-spacing: -0.2px;
        }
        .send-btn:hover { background: #8f80ff; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,106,255,0.3); }
        .send-btn:active { transform: scale(0.99); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* Result panels */
        .result-panel {
          border-radius: 14px; overflow: hidden;
          margin-bottom: 12px;
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .result-success {
          background: var(--green-dim);
          border: 1px solid var(--green-border);
        }
        .result-error {
          background: var(--red-dim);
          border: 1px solid var(--red-border);
        }

        .result-header {
          padding: 14px 18px;
          display: flex; align-items: center; gap: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .result-icon {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-size: 15px;
        }

        .result-title {
          font-size: 14px; font-weight: 600;
          color: var(--text); flex: 1;
        }
        .result-title-sub {
          font-size: 11px; color: var(--muted);
          font-family: var(--mono); margin-top: 1px;
        }

        .result-body { padding: 16px 18px; }

        /* Info rows */
        .info-row {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px;
          padding: 7px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 12px;
        }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: var(--muted); font-family: var(--mono); flex-shrink: 0; }
        .info-value { color: var(--text); text-align: right; font-family: var(--mono); word-break: break-all; }
        .info-value.green { color: var(--green); }
        .info-value.red { color: var(--red); }

        /* Diagnosis */
        .diagnosis {
          margin-top: 14px;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 14px 16px;
        }
        .diagnosis-title {
          font-size: 10px; font-family: var(--mono);
          letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--muted); margin-bottom: 10px;
        }
        .diagnosis-item {
          font-size: 12px; color: var(--text);
          font-family: var(--sans);
          padding: 5px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          line-height: 1.6;
        }
        .diagnosis-item:last-child { border-bottom: none; padding-bottom: 0; }

        /* Raw debug */
        .raw-toggle {
          width: 100%; padding: 10px 16px;
          background: transparent; border: 1px solid var(--border2);
          border-radius: 8px; color: var(--muted);
          font-size: 11px; font-family: var(--mono);
          letter-spacing: 1px; text-transform: uppercase;
          cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; justify-content: space-between;
        }
        .raw-toggle:hover { color: var(--text); border-color: var(--border); }

        .raw-json {
          background: #080a0e;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          font-size: 11px; font-family: var(--mono);
          color: #8892a4; line-height: 1.7;
          overflow-x: auto; white-space: pre-wrap;
          word-break: break-word;
          margin-top: 8px;
          max-height: 400px; overflow-y: auto;
        }

        /* Env hint */
        .env-hint {
          background: rgba(245,197,66,0.05);
          border: 1px solid rgba(245,197,66,0.15);
          border-radius: 10px;
          padding: 14px 16px;
          font-size: 12px; color: #b8a240;
          font-family: var(--mono); line-height: 1.7;
        }
        .env-hint code {
          background: rgba(245,197,66,0.1);
          padding: 1px 6px; border-radius: 3px;
          color: var(--yellow);
        }
      `}</style>

      <div className="page">
        <div className="inner">

          {/* Header */}
          <div className="header">
            <div className="dev-badge">
              <span className="dev-badge-dot" />
              Dev Tool · Not For Production
            </div>
            <h1>Termii SMS Tester</h1>
            <p className="subtitle">
              Send a real SMS via your Termii API key and diagnose any issues — channel failures, auth errors, balance problems, and more.
            </p>
          </div>

          {/* Env check notice */}
          <div className="env-hint" style={{ marginBottom: 16 }}>
            This uses your <code>TERMII_API_KEY</code> and <code>TERMII_SENDER_ID</code> from <code>.env.local</code>. The API key is never exposed to the browser.
          </div>

          {/* Form */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon" style={{ background: 'rgba(124,106,255,0.1)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a89aff" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <span className="card-title">Send Test SMS</span>
            </div>
            <div className="card-body">

              <div className="field">
                <label className="label">Phone Number</label>
                <input
                  className="input"
                  type="tel"
                  placeholder="08012345678 or 2348012345678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                />
              </div>

              <div className="field">
                <label className="label">Message</label>
                <textarea
                  className="input"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="field">
                <label className="label">Channel</label>
                <div className="channel-row">
                  <button
                    className={`channel-btn ${channel === 'generic' ? 'active' : ''}`}
                    onClick={() => setChannel('generic')}
                  >
                    Generic
                    <span>Standard delivery</span>
                  </button>
                  <button
                    className={`channel-btn ${channel === 'dnd' ? 'active' : ''}`}
                    onClick={() => setChannel('dnd')}
                  >
                    DND
                    <span>Bypasses Do Not Disturb</span>
                  </button>
                </div>
              </div>

              <button
                className="send-btn"
                onClick={handleSend}
                disabled={status === 'sending' || !phone.trim() || !message.trim()}
              >
                {status === 'sending'
                  ? <><span className="spinner" /> Sending & Diagnosing…</>
                  : <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Send Test SMS
                  </>
                }
              </button>
            </div>
          </div>

          {/* Success result */}
          {status === 'success' && result && (
            <div className="result-panel result-success">
              <div className="result-header">
                <div className="result-icon" style={{ background: 'rgba(0,229,160,0.12)' }}>✅</div>
                <div>
                  <div className="result-title">SMS Sent Successfully</div>
                  <div className="result-title-sub">Your Termii integration is working</div>
                </div>
              </div>
              <div className="result-body">
                <div className="info-row">
                  <span className="info-label">Channel used</span>
                  <span className="info-value green">{result.channel_used ?? '—'}</span>
                </div>
                {result.message_id && (
                  <div className="info-row">
                    <span className="info-label">Message ID</span>
                    <span className="info-value">{result.message_id}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">Status</span>
                  <span className="info-value green">Delivered to Termii network</span>
                </div>
              </div>
            </div>
          )}

          {/* Error result */}
          {status === 'error' && result && (
            <div className="result-panel result-error">
              <div className="result-header">
                <div className="result-icon" style={{ background: 'rgba(255,77,106,0.12)' }}>❌</div>
                <div>
                  <div className="result-title">SMS Failed</div>
                  <div className="result-title-sub">Stage: {result.stage ?? 'unknown'}</div>
                </div>
              </div>
              <div className="result-body">
                <div className="info-row">
                  <span className="info-label">Error</span>
                  <span className="info-value red" style={{ textAlign: 'left' }}>{result.error}</span>
                </div>

                {result.diagnosis && result.diagnosis.length > 0 && (
                  <div className="diagnosis">
                    <div className="diagnosis-title">Diagnosis & Fix</div>
                    {result.diagnosis.map((d, i) => (
                      <div key={i} className="diagnosis-item">{d}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Raw debug output */}
          {result && (
            <div style={{ marginTop: 8 }}>
              <button className="raw-toggle" onClick={() => setShowRaw(v => !v)}>
                <span>Raw Debug Output</span>
                <span>{showRaw ? '▲ hide' : '▼ show'}</span>
              </button>
              {showRaw && (
                <pre className="raw-json">
                  {JSON.stringify(result.debug ?? result, null, 2)}
                </pre>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}