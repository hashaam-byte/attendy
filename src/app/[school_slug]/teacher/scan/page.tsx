'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle, Clock, AlertCircle, LogOut, Zap, User, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const QRScanner = dynamic(() => import('@/components/scanner/QRScanner'), {
  ssr: false,
  loading: () => (
    <div className="scanner-loading">
      <div className="scanner-pulse" />
      <p>Initialising camera...</p>
    </div>
  ),
})

interface ScanResult {
  status: 'success' | 'late' | 'duplicate' | 'error'
  studentName: string
  class: string
  time: string
  message?: string
}

interface ResolvedUser {
  userId: string
  schoolId: string
  fullName: string
  role: string
}

export default function TeacherScanPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const supabase = createClient()
  const router = useRouter()

  const [processing, setProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [lateReason, setLateReason] = useState('')
  const [showLateReason, setShowLateReason] = useState(false)
  const [pendingScan, setPendingScan] = useState<string | null>(null)
  const [pendingStudent, setPendingStudent] = useState<any | null>(null)
  const [resolvedUser, setResolvedUser] = useState<ResolvedUser | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [teacherName, setTeacherName] = useState('')
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('user_profiles').select('full_name').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setTeacherName(data.full_name) })
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
    if (!user) { toast.error('Session expired'); setProcessing(false); return }

    const { data: student } = await supabase.from('students').select('id, full_name, class, school_id').eq('qr_code', qrCode).eq('school_id', user.schoolId).single()
    if (!student) { toast.error('Student not found in this school'); setProcessing(false); return }

    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase.from('attendance_logs').select('id, scanned_at').eq('student_id', student.id).eq('school_id', user.schoolId).eq('scan_type', 'entry').gte('scanned_at', `${today}T00:00:00`).maybeSingle()

    if (existing) {
      const time = new Date(existing.scanned_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
      setLastResult({ status: 'duplicate', studentName: student.full_name, class: student.class, time, message: `Already scanned today at ${time}` })
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

    if (isLate) {
      setPendingScan(qrCode)
      setPendingStudent(student)
      setShowLateReason(true)
      setProcessing(false)
      return
    }

    await recordAttendance(student, user, false, '')
  }

  async function recordAttendance(student: any, user: ResolvedUser, isLate: boolean, reason: string) {
    const { error } = await supabase.from('attendance_logs').insert({
      school_id: user.schoolId, student_id: student.id, scan_type: 'entry',
      is_late: isLate, late_reason: reason || null,
      scanned_by: user.userId, scanned_by_role: user.role, scanned_by_name: user.fullName,
    })

    const time = new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })

    if (error) {
      setLastResult({ status: 'error', studentName: student.full_name, class: student.class, time, message: error.message })
    } else {
      setScanCount(c => c + 1)
      setLastResult({ status: isLate ? 'late' : 'success', studentName: student.full_name, class: student.class, time })
      fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: student.id, isLate, reason, time }) }).catch(() => {})
    }

    setProcessing(false)
    setShowLateReason(false)
    setPendingScan(null)
    setPendingStudent(null)
    setLateReason('')
  }

  async function submitLateReason() {
    if (!pendingScan || !pendingStudent) return
    setProcessing(true)
    const user = await getResolvedUser()
    if (!user) { toast.error('Session expired'); setProcessing(false); return }
    await recordAttendance(pendingStudent, user, true, lateReason)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        :root {
          --bg: #080c0a;
          --surface: #0d1410;
          --surface2: #121a14;
          --border: #1a2420;
          --border2: #243028;
          --green: #00e676;
          --green-dim: rgba(0,230,118,0.08);
          --green-glow: rgba(0,230,118,0.2);
          --green-text: #4ade80;
          --text: #e2ece6;
          --muted: #5a7060;
          --muted2: #3a4e40;
          --yellow: #ffd32a;
          --yellow-dim: rgba(255,211,42,0.08);
          --blue: #5352ed;
          --blue-dim: rgba(83,82,237,0.08);
          --red: #ff4757;
          --red-dim: rgba(255,71,87,0.08);
          --mono: 'IBM Plex Mono', monospace;
          --sans: 'IBM Plex Sans', sans-serif;
        }

        * { box-sizing: border-box; }

        .scanner-shell {
          min-height: 100vh;
          background: var(--bg);
          font-family: var(--sans);
          color: var(--text);
          position: relative;
          overflow: hidden;
        }

        .scanner-shell::before {
          content: '';
          position: fixed; inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.015) 2px, rgba(0,0,0,0.015) 4px);
          pointer-events: none; z-index: 0;
        }

        .topbar {
          position: sticky; top: 0; z-index: 10;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 0 16px;
          height: 52px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }

        .topbar-left {
          display: flex; align-items: center; gap: 10px;
        }

        .topbar-icon {
          width: 32px; height: 32px;
          background: var(--green-dim);
          border: 1px solid rgba(0,230,118,0.15);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }

        .topbar-info { }
        .topbar-title {
          font-size: 13px; font-weight: 600; color: var(--text);
          line-height: 1.2;
        }
        .topbar-sub {
          font-size: 10px; color: var(--muted);
          font-family: var(--mono);
          text-transform: capitalize;
        }

        .topbar-right {
          display: flex; align-items: center; gap: 8px;
        }

        .clock {
          font-size: 11px; font-family: var(--mono);
          color: var(--muted);
          background: var(--surface2);
          border: 1px solid var(--border);
          padding: 4px 10px; border-radius: 5px;
        }

        .logout-btn {
          width: 32px; height: 32px;
          background: transparent;
          border: 1px solid var(--border2);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: var(--muted); cursor: pointer;
          transition: all 0.15s;
        }
        .logout-btn:hover { background: var(--red-dim); color: var(--red); border-color: rgba(255,71,87,0.2); }

        .content {
          position: relative; z-index: 1;
          max-width: 400px; margin: 0 auto;
          padding: 20px 16px 100px;
        }

        /* Scanner box */
        .scanner-box {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .scanner-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 8px;
        }

        .scanner-status-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 6px var(--green);
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .scanner-status-label {
          font-size: 11px; font-family: var(--mono);
          letter-spacing: 0.5px; text-transform: uppercase;
          color: var(--green-text);
        }

        .scanner-count {
          margin-left: auto;
          font-size: 10px; font-family: var(--mono);
          color: var(--muted2);
        }

        .scanner-viewport {
          padding: 16px;
          background: #060908;
        }

        .scanner-loading {
          height: 240px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px;
        }

        .scanner-pulse {
          width: 60px; height: 60px;
          border-radius: 50%;
          border: 2px solid var(--border2);
          border-top-color: var(--green);
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .scanner-loading p {
          font-size: 11px; font-family: var(--mono);
          color: var(--muted); letter-spacing: 1px;
        }

        .processing-bar {
          height: 2px;
          background: var(--border);
          overflow: hidden;
        }
        .processing-bar-fill {
          height: 100%;
          background: var(--green);
          animation: slide 1.2s ease-in-out infinite;
        }
        @keyframes slide { 0%{width:0;margin-left:0} 50%{width:60%;margin-left:20%} 100%{width:0;margin-left:100%} }

        /* Result card */
        .result-card {
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          animation: pop 0.25s cubic-bezier(0.22,0.68,0,1.2);
        }
        @keyframes pop { from{transform:scale(0.95);opacity:0} to{transform:scale(1);opacity:1} }

        .result-success { background: rgba(0,230,118,0.07); border: 1px solid rgba(0,230,118,0.2); }
        .result-late { background: rgba(255,211,42,0.07); border: 1px solid rgba(255,211,42,0.2); }
        .result-duplicate { background: rgba(83,82,237,0.07); border: 1px solid rgba(83,82,237,0.2); }
        .result-error { background: rgba(255,71,87,0.07); border: 1px solid rgba(255,71,87,0.2); }

        .result-top {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 10px;
        }

        .result-icon-wrap {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .result-student { flex: 1; }
        .result-name { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
        .result-class { font-size: 11px; color: var(--muted); font-family: var(--mono); }

        .result-badge {
          font-size: 10px; font-family: var(--mono);
          letter-spacing: 0.5px; text-transform: uppercase;
          padding: 4px 10px; border-radius: 4px;
          white-space: nowrap;
        }

        .result-time {
          font-size: 11px; font-family: var(--mono);
          color: var(--muted); padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        /* Late reason modal */
        .late-modal {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.85);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }

        .late-modal-card {
          background: var(--surface);
          border: 1px solid rgba(255,211,42,0.2);
          border-radius: 16px;
          padding: 24px;
          width: 100%; max-width: 360px;
        }

        .late-modal-icon {
          width: 44px; height: 44px;
          background: rgba(255,211,42,0.1);
          border: 1px solid rgba(255,211,42,0.2);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }

        .late-modal h2 { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
        .late-modal p { font-size: 13px; color: var(--muted); margin-bottom: 16px; line-height: 1.5; }

        .late-modal textarea {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px; font-family: var(--sans);
          color: var(--text); resize: none; outline: none;
          margin-bottom: 14px;
          transition: border-color 0.2s;
        }
        .late-modal textarea:focus { border-color: rgba(255,211,42,0.3); }
        .late-modal textarea::placeholder { color: var(--muted2); }

        .late-modal-actions { display: flex; gap: 10px; }
        .btn-cancel {
          flex: 1; background: transparent;
          border: 1px solid var(--border2);
          color: var(--muted); padding: 10px;
          border-radius: 8px; font-size: 13px;
          font-family: var(--sans); cursor: pointer;
          transition: all 0.15s;
        }
        .btn-cancel:hover { color: var(--text); border-color: var(--border); }

        .btn-late {
          flex: 1;
          background: #ffd32a; color: #000;
          border: none; padding: 10px;
          border-radius: 8px;
          font-size: 13px; font-weight: 600;
          font-family: var(--sans); cursor: pointer;
          transition: opacity 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .btn-late:hover { opacity: 0.88; }
        .btn-late:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Stats row */
        .stats-row {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; margin-bottom: 12px;
        }

        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 14px;
        }

        .stat-label { font-size: 10px; color: var(--muted); font-family: var(--mono); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 4px; }
        .stat-value { font-size: 22px; font-weight: 600; font-family: var(--mono); color: var(--text); letter-spacing: -1px; }

        @media (max-width: 400px) {
          .clock { display: none; }
        }
      `}</style>

      <div className="scanner-shell">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-icon">
              <BookOpen size={15} color="#4ade80" />
            </div>
            <div className="topbar-info">
              <div className="topbar-title">{teacherName || 'Teacher'}</div>
              <div className="topbar-sub">{school_slug?.replace(/-/g, ' ')}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="clock">{currentTime}</div>
            <button className="logout-btn" onClick={async () => { await supabase.auth.signOut(); router.push(`/${school_slug}/login`) }} title="Log out">
              <LogOut size={14} />
            </button>
          </div>
        </div>

        <div className="content">
          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Scanned today</div>
              <div className="stat-value" style={{ color: '#4ade80' }}>{scanCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Status</div>
              <div className="stat-value" style={{ fontSize: 13, marginTop: 2, color: processing ? '#fbbf24' : '#4ade80' }}>
                {processing ? 'Processing...' : 'Ready'}
              </div>
            </div>
          </div>

          {/* Scanner */}
          <div className="scanner-box">
            <div className="scanner-header">
              <span className="scanner-status-dot" />
              <span className="scanner-status-label">Scanner active</span>
              <span className="scanner-count">{scanCount} scan{scanCount !== 1 ? 's' : ''} today</span>
            </div>
            <div className="scanner-viewport">
              <QRScanner onScan={handleScan} onError={err => toast.error('Camera: ' + err)} active={!processing && !showLateReason} />
            </div>
            {processing && <div className="processing-bar"><div className="processing-bar-fill" /></div>}
          </div>

          {/* Last result */}
          {lastResult && (() => {
            const configs = {
              success: { cls: 'result-success', iconBg: 'rgba(0,230,118,0.1)', icon: <CheckCircle size={20} color="#4ade80" />, badge: 'ON TIME', badgeBg: 'rgba(0,230,118,0.1)', badgeColor: '#4ade80' },
              late: { cls: 'result-late', iconBg: 'rgba(255,211,42,0.1)', icon: <Clock size={20} color="#fbbf24" />, badge: 'LATE', badgeBg: 'rgba(255,211,42,0.1)', badgeColor: '#fbbf24' },
              duplicate: { cls: 'result-duplicate', iconBg: 'rgba(83,82,237,0.1)', icon: <AlertCircle size={20} color="#818cf8" />, badge: 'ALREADY SCANNED', badgeBg: 'rgba(83,82,237,0.1)', badgeColor: '#818cf8' },
              error: { cls: 'result-error', iconBg: 'rgba(255,71,87,0.1)', icon: <AlertCircle size={20} color="#f87171" />, badge: 'ERROR', badgeBg: 'rgba(255,71,87,0.1)', badgeColor: '#f87171' },
            }
            const c = configs[lastResult.status]
            return (
              <div className={`result-card ${c.cls}`}>
                <div className="result-top">
                  <div className="result-icon-wrap" style={{ background: c.iconBg }}>{c.icon}</div>
                  <div className="result-student">
                    <div className="result-name">{lastResult.studentName}</div>
                    <div className="result-class">{lastResult.class}</div>
                  </div>
                  <span className="result-badge" style={{ background: c.badgeBg, color: c.badgeColor, border: `1px solid ${c.badgeColor}25` }}>{c.badge}</span>
                </div>
                <div className="result-time">{lastResult.message ?? `Scanned at ${lastResult.time}`}</div>
              </div>
            )
          })()}
        </div>

        {/* Late reason modal */}
        {showLateReason && (
          <div className="late-modal">
            <div className="late-modal-card">
              <div className="late-modal-icon"><Clock size={22} color="#fbbf24" /></div>
              <h2>Student Arriving Late</h2>
              <p><strong style={{ color: '#e2ece6' }}>{pendingStudent?.full_name}</strong> ({pendingStudent?.class}) is past the cutoff. Add a reason if known.</p>
              <textarea value={lateReason} onChange={e => setLateReason(e.target.value)} placeholder="e.g. Heavy traffic, family situation..." rows={3} />
              <div className="late-modal-actions">
                <button className="btn-cancel" onClick={() => { setShowLateReason(false); setPendingScan(null); setPendingStudent(null); setProcessing(false) }}>Cancel</button>
                <button className="btn-late" onClick={submitLateReason} disabled={processing}>
                  {processing ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : <Zap size={14} />}
                  Record Late
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}