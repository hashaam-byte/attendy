'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle, Clock, AlertCircle, LogOut, Shield, Zap } from 'lucide-react'
import dynamic from 'next/dynamic'

const QRScanner = dynamic(() => import('@/components/scanner/QRScanner'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#060908' }}>
      <div style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid #1a2420', borderTopColor: '#00e676', animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#5a7060', letterSpacing: 1 }}>Initialising camera...</p>
    </div>
  ),
})

interface ScanResult {
  status: 'success' | 'late' | 'duplicate' | 'error'
  studentName: string
  studentClass: string
  time: string
  message?: string
}

interface ResolvedUser {
  userId: string
  schoolId: string
  fullName: string
  role: string
}

export default function GatemanScanPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const supabase = createClient()
  const router = useRouter()

  const [processing, setProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [resolvedUser, setResolvedUser] = useState<ResolvedUser | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [gateName, setGateName] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setCurrentDate(now.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('user_profiles').select('full_name').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setGateName(data.full_name) })
    })
  }, [])

  async function getResolvedUser(): Promise<ResolvedUser | null> {
    if (resolvedUser) return resolvedUser
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase.from('user_profiles').select('school_id, full_name, role').eq('user_id', user.id).single()
    if (!profile) return null
    const resolved: ResolvedUser = { userId: user.id, schoolId: profile.school_id, fullName: profile.full_name, role: profile.role }
    setResolvedUser(resolved)
    return resolved
  }

  async function handleScan(qrCode: string) {
    if (processing) return
    setProcessing(true)

    const user = await getResolvedUser()
    if (!user) { toast.error('Session expired. Please log in again.'); setProcessing(false); return }

    const { data: student } = await supabase.from('students').select('id, full_name, class').eq('qr_code', qrCode).eq('school_id', user.schoolId).single()
    if (!student) { toast.error('Unknown QR code — student not found'); setProcessing(false); return }

    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase.from('attendance_logs').select('id, scanned_at').eq('student_id', student.id).eq('school_id', user.schoolId).eq('scan_type', 'entry').gte('scanned_at', `${today}T00:00:00`).maybeSingle()

    const time = new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })

    if (existing) {
      const existingTime = new Date(existing.scanned_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
      setLastResult({ status: 'duplicate', studentName: student.full_name, studentClass: student.class, time, message: `Already scanned today at ${existingTime}` })
      setProcessing(false)
      return
    }

    const [overrideRes, settingsRes] = await Promise.all([
      supabase.from('late_cutoff_overrides').select('cutoff_time').eq('school_id', user.schoolId).eq('override_date', today).maybeSingle(),
      supabase.from('school_settings').select('late_cutoff').eq('school_id', user.schoolId).single(),
    ])

    const cutoffTime = overrideRes.data?.cutoff_time ?? settingsRes.data?.late_cutoff ?? '08:00'
    const now = new Date()
    const [ch, cm] = cutoffTime.split(':').map(Number)
    const cutoff = new Date(); cutoff.setHours(ch, cm, 0, 0)
    const isLate = now > cutoff

    const { error } = await supabase.from('attendance_logs').insert({
      school_id: user.schoolId, student_id: student.id, scan_type: 'entry',
      is_late: isLate, scanned_by: user.userId, scanned_by_role: 'gateman', scanned_by_name: user.fullName,
    })

    if (error) {
      setLastResult({ status: 'error', studentName: student.full_name, studentClass: student.class, time, message: error.message })
    } else {
      setScanCount(c => c + 1)
      setLastResult({ status: isLate ? 'late' : 'success', studentName: student.full_name, studentClass: student.class, time })
      fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: student.id, isLate, reason: '', time }) }).catch(() => {})
    }

    setProcessing(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideUp { from{transform:translateY(10px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes sweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }

        :root {
          --bg: #080c0a; --surface: #0d1410; --surface2: #121a14;
          --border: #1a2420; --border2: #243028;
          --green: #00e676; --green-dim: rgba(0,230,118,0.08);
          --green-text: #4ade80; --text: #e2ece6;
          --muted: #5a7060; --muted2: #3a4e40;
          --yellow: #ffd32a; --red: #ff4757;
          --blue: #5352ed;
          --mono: 'IBM Plex Mono', monospace;
          --sans: 'IBM Plex Sans', sans-serif;
        }

        *, *::before, *::after { box-sizing: border-box; }

        .gate-shell {
          min-height: 100vh; background: var(--bg);
          font-family: var(--sans); color: var(--text);
          position: relative;
        }

        .gate-shell::before {
          content: '';
          position: fixed; inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.015) 2px, rgba(0,0,0,0.015) 4px);
          pointer-events: none; z-index: 0;
        }

        /* Header */
        .gate-header {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 0 16px; height: 56px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 10;
        }

        .gate-logo-wrap {
          display: flex; align-items: center; gap: 10px;
        }

        .gate-logo {
          width: 34px; height: 34px;
          background: linear-gradient(135deg, #16a34a, #00e676);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 12px rgba(0,230,118,0.25);
        }

        .gate-title-block { }
        .gate-title { font-size: 14px; font-weight: 600; color: var(--text); }
        .gate-subtitle { font-size: 10px; color: var(--muted); font-family: var(--mono); text-transform: capitalize; }

        .gate-header-right { display: flex; align-items: center; gap: 8px; }

        .live-badge {
          display: flex; align-items: center; gap: 5px;
          background: var(--green-dim); border: 1px solid rgba(0,230,118,0.15);
          padding: 4px 10px; border-radius: 5px;
          font-size: 10px; font-family: var(--mono);
          color: var(--green-text); letter-spacing: 1px;
        }

        .live-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--green); box-shadow: 0 0 4px var(--green);
          animation: pulse 2s infinite;
        }

        .logout-btn {
          width: 32px; height: 32px;
          background: transparent; border: 1px solid var(--border2);
          border-radius: 7px; color: var(--muted);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.15s;
        }
        .logout-btn:hover { background: rgba(255,71,87,0.08); color: var(--red); border-color: rgba(255,71,87,0.2); }

        /* Body */
        .gate-body {
          position: relative; z-index: 1;
          max-width: 400px; margin: 0 auto;
          padding: 16px 16px 100px;
        }

        /* Info row */
        .info-row {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 8px; margin-bottom: 14px;
        }

        .info-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 9px; padding: 11px 13px;
        }

        .info-label { font-size: 9px; font-family: var(--mono); letter-spacing: 1px; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px; }
        .info-value { font-size: 14px; font-weight: 600; font-family: var(--mono); color: var(--text); letter-spacing: -0.5px; }

        /* Scanner */
        .scanner-panel {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; overflow: hidden; margin-bottom: 14px;
        }

        .scanner-head {
          padding: 11px 16px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 8px;
        }

        .scan-indicator { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 5px var(--green); animation: pulse 2s infinite; }
        .scan-label { font-size: 11px; font-family: var(--mono); letter-spacing: 0.5px; text-transform: uppercase; color: var(--green-text); }
        .scan-count { margin-left: auto; font-size: 10px; font-family: var(--mono); color: var(--muted2); }

        .scanner-inner { background: #050808; }

        .progress-line { height: 2px; background: var(--border); overflow: hidden; }
        .progress-fill { height: 100%; background: var(--green); position: relative; overflow: hidden; }
        .progress-fill::after { content: ''; position: absolute; inset-y: 0; left: 0; width: 40%; background: rgba(255,255,255,0.3); animation: sweep 1s ease-in-out infinite; }

        /* Result */
        .result-panel {
          border-radius: 12px; padding: 14px 16px;
          animation: slideUp 0.25s ease;
        }

        .rp-success { background: rgba(0,230,118,0.07); border: 1px solid rgba(0,230,118,0.18); }
        .rp-late { background: rgba(255,211,42,0.07); border: 1px solid rgba(255,211,42,0.18); }
        .rp-duplicate { background: rgba(83,82,237,0.07); border: 1px solid rgba(83,82,237,0.18); }
        .rp-error { background: rgba(255,71,87,0.07); border: 1px solid rgba(255,71,87,0.18); }

        .rp-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }

        .rp-icon {
          width: 42px; height: 42px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .rp-info { flex: 1; }
        .rp-name { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 1px; }
        .rp-class { font-size: 11px; color: var(--muted); font-family: var(--mono); }

        .rp-badge {
          font-size: 10px; font-family: var(--mono); letter-spacing: 0.5px;
          text-transform: uppercase; padding: 4px 10px;
          border-radius: 4px; white-space: nowrap;
        }

        .rp-footer {
          font-size: 11px; color: var(--muted); font-family: var(--mono);
          border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;
        }
      `}</style>

      <div className="gate-shell">
        <div className="gate-header">
          <div className="gate-logo-wrap">
            <div className="gate-logo">
              <Shield size={17} color="white" />
            </div>
            <div className="gate-title-block">
              <div className="gate-title">{gateName || 'Gate Scanner'}</div>
              <div className="gate-subtitle">{school_slug?.replace(/-/g, ' ')}</div>
            </div>
          </div>
          <div className="gate-header-right">
            <div className="live-badge"><span className="live-dot" />LIVE</div>
            <button className="logout-btn" onClick={async () => { await supabase.auth.signOut(); router.push(`/${school_slug}/login`) }} title="Log out">
              <LogOut size={14} />
            </button>
          </div>
        </div>

        <div className="gate-body">
          {/* Info row */}
          <div className="info-row">
            <div className="info-card">
              <div className="info-label">Scanned</div>
              <div className="info-value" style={{ color: '#4ade80' }}>{scanCount}</div>
            </div>
            <div className="info-card">
              <div className="info-label">Status</div>
              <div className="info-value" style={{ fontSize: 11, color: processing ? '#fbbf24' : '#4ade80', marginTop: 3 }}>
                {processing ? 'Processing' : 'Ready'}
              </div>
            </div>
            <div className="info-card">
              <div className="info-label">Time</div>
              <div className="info-value" style={{ fontSize: 12 }}>{currentTime.slice(0, 5)}</div>
            </div>
          </div>

          {/* Scanner */}
          <div className="scanner-panel">
            <div className="scanner-head">
              <span className="scan-indicator" />
              <span className="scan-label">QR Scanner</span>
              <span className="scan-count">{scanCount} scanned today</span>
            </div>
            <div className="scanner-inner">
              <QRScanner onScan={handleScan} active={!processing} />
            </div>
            {processing && (
              <div className="progress-line">
                <div className="progress-fill" style={{ width: '100%' }} />
              </div>
            )}
          </div>

          {/* Result */}
          {lastResult && (() => {
            type Status = 'success' | 'late' | 'duplicate' | 'error'
            const cfg: Record<Status, any> = {
              success: { cls: 'rp-success', iconBg: 'rgba(0,230,118,0.1)', icon: <CheckCircle size={20} color="#4ade80" />, badge: 'ON TIME', bBg: 'rgba(0,230,118,0.1)', bColor: '#4ade80' },
              late:    { cls: 'rp-late', iconBg: 'rgba(255,211,42,0.1)', icon: <Clock size={20} color="#fbbf24" />, badge: 'LATE', bBg: 'rgba(255,211,42,0.1)', bColor: '#fbbf24' },
              duplicate: { cls: 'rp-duplicate', iconBg: 'rgba(83,82,237,0.1)', icon: <AlertCircle size={20} color="#818cf8" />, badge: 'DUPLICATE', bBg: 'rgba(83,82,237,0.1)', bColor: '#818cf8' },
              error:   { cls: 'rp-error', iconBg: 'rgba(255,71,87,0.1)', icon: <AlertCircle size={20} color="#f87171" />, badge: 'ERROR', bBg: 'rgba(255,71,87,0.1)', bColor: '#f87171' },
            }
            const c = cfg[lastResult.status]
            return (
              <div className={`result-panel ${c.cls}`}>
                <div className="rp-top">
                  <div className="rp-icon" style={{ background: c.iconBg }}>{c.icon}</div>
                  <div className="rp-info">
                    <div className="rp-name">{lastResult.studentName}</div>
                    <div className="rp-class">{lastResult.studentClass}</div>
                  </div>
                  <span className="rp-badge" style={{ background: c.bBg, color: c.bColor, border: `1px solid ${c.bColor}25` }}>{c.badge}</span>
                </div>
                <div className="rp-footer">{lastResult.message ?? `Scanned at ${lastResult.time}`}</div>
              </div>
            )
          })()}
        </div>
      </div>
    </>
  )
}