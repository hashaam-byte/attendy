'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface Student {
  id: string
  full_name: string
  class: string
  parent_name: string | null
}

interface AttendanceLog {
  id: string
  scan_type: string
  scanned_at: string
  is_late: boolean
  late_reason: string | null
  scanned_by_name: string
  students: { full_name: string; class: string }
}

export default function ParentMyChildPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [stats, setStats] = useState({ total: 0, onTime: 0, late: 0 })

  useEffect(() => {
    const token = localStorage.getItem('parent_token')
    const storedSchool = localStorage.getItem('parent_school')

    if (!token || storedSchool !== school_slug) {
      router.replace(`/${school_slug}/parent/login`)
      return
    }

    fetch('/api/parent-attendance', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return }
        setStudents(data.students ?? [])
        setLogs(data.logs ?? [])
        setSchoolName(data.school_name ?? '')
        const total = data.logs?.length ?? 0
        const late = data.logs?.filter((l: AttendanceLog) => l.is_late).length ?? 0
        setStats({ total, late, onTime: total - late })
        setLoading(false)
      })
      .catch(() => { setError('Failed to load. Please try again.'); setLoading(false) })
  }, [school_slug, router])

  const filteredLogs = selectedStudent === 'all'
    ? logs
    : logs.filter(l => l.students?.full_name === students.find(s => s.id === selectedStudent)?.full_name)

  const todayLogs = filteredLogs.filter(l => {
    const logDate = new Date(l.scanned_at).toDateString()
    return logDate === new Date().toDateString()
  })

  function logout() {
    localStorage.removeItem('parent_token')
    localStorage.removeItem('parent_school')
    router.push(`/${school_slug}/parent/login`)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080c0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#5a7060', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, letterSpacing: 2 }}>
        <div style={{ width: 32, height: 32, border: '2px solid #1a2420', borderTopColor: '#00e676', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        LOADING...
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#080c0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0d1410', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 12, padding: 24, maxWidth: 360, textAlign: 'center', fontFamily: 'IBM Plex Sans, sans-serif', color: '#f87171', fontSize: 14 }}>
        {error}
        <br /><br />
        <button onClick={() => router.push(`/${school_slug}/parent/login`)} style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 13 }}>
          Back to Login
        </button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        *, *::before, *::after { box-sizing: border-box; }
        :root {
          --bg: #080c0a; --surface: #0d1410; --surface2: #121a14;
          --border: #1a2420; --border2: #243028;
          --green: #00e676; --green-dim: rgba(0,230,118,0.08);
          --green-text: #4ade80; --text: #e2ece6;
          --muted: #5a7060; --muted2: #3a4e40;
          --yellow: #ffd32a; --red: #ff4757;
          --mono: 'IBM Plex Mono', monospace;
          --sans: 'IBM Plex Sans', sans-serif;
        }
        html, body { background: var(--bg); margin: 0; }

        .parent-shell {
          min-height: 100vh; background: var(--bg);
          font-family: var(--sans); color: var(--text);
          position: relative;
        }
        .parent-shell::before {
          content:''; position:fixed; inset:0;
          background: repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.015) 2px,rgba(0,0,0,0.015) 4px);
          pointer-events:none;
        }

        .topbar {
          position: sticky; top: 0; z-index: 10;
          background: var(--surface); border-bottom: 1px solid var(--border);
          padding: 0 16px; height: 52px;
          display: flex; align-items: center; justify-content: space-between;
        }

        .topbar-left { display:flex; align-items:center; gap:10px; }

        .topbar-logo {
          width: 30px; height: 30px; background: #16a34a;
          border-radius: 7px; display: flex; align-items: center; justify-content: center;
        }

        .topbar-info { }
        .topbar-title { font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.2; }
        .topbar-sub { font-size: 10px; color: var(--green-text); font-family: var(--mono); }

        .logout-btn {
          font-size: 11px; font-family: var(--mono); color: var(--muted);
          background: transparent; border: 1px solid var(--border2);
          padding: 5px 12px; border-radius: 5px; cursor: pointer;
          transition: all 0.15s; letter-spacing: 0.5px;
        }
        .logout-btn:hover { color: var(--red); border-color: rgba(255,71,87,0.2); }

        .content {
          position: relative; z-index: 1;
          max-width: 480px; margin: 0 auto;
          padding: 16px 16px 80px;
        }

        /* Today banner */
        .today-banner {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 14px 16px;
          margin-bottom: 12px; display: flex; align-items: center; gap: 12px;
        }

        .today-icon {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .today-info { flex: 1; }
        .today-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
        .today-sub { font-size: 11px; color: var(--muted); font-family: var(--mono); }

        /* Stats row */
        .stats-row {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 8px; margin-bottom: 14px;
        }

        .stat-box {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; padding: 12px 14px;
        }

        .stat-label { font-size: 9px; font-family: var(--mono); letter-spacing: 1px; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px; }
        .stat-val { font-size: 22px; font-weight: 600; font-family: var(--mono); color: var(--text); letter-spacing: -1px; }

        /* Children selector */
        .children-row {
          display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;
        }

        .child-chip {
          padding: 7px 14px; border-radius: 8px;
          font-size: 12px; font-weight: 500; cursor: pointer;
          border: 1px solid var(--border2); background: transparent;
          color: var(--muted); transition: all 0.15s; font-family: var(--sans);
        }
        .child-chip:hover { color: var(--text); border-color: var(--border); }
        .child-chip.active {
          background: var(--green-dim); color: var(--green-text);
          border-color: rgba(0,230,118,0.2);
        }

        /* Section header */
        .section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .section-title { font-size: 11px; font-family: var(--mono); letter-spacing: 1px; text-transform: uppercase; color: var(--muted); }
        .section-count { font-size: 10px; font-family: var(--mono); color: var(--muted2); }

        /* Log item */
        .log-item {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; padding: 13px 14px;
          margin-bottom: 8px; display: flex; align-items: flex-start; gap: 11px;
          animation: slideUp 0.2s ease;
          transition: border-color 0.15s;
        }
        .log-item:hover { border-color: var(--border2); }

        .log-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px;
        }

        .log-main { flex: 1; }
        .log-student { font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 2px; }
        .log-time { font-size: 11px; color: var(--muted); font-family: var(--mono); }
        .log-reason { font-size: 11px; color: #fbbf24; margin-top: 4px; }

        .log-badge {
          font-size: 10px; font-family: var(--mono); letter-spacing: 0.5px;
          text-transform: uppercase; padding: 3px 9px;
          border-radius: 4px; white-space: nowrap;
        }

        .empty-state {
          text-align: center; padding: 40px 20px;
          color: var(--muted2); font-family: var(--mono);
          font-size: 11px; letter-spacing: 1px;
        }

        .child-card {
          background: linear-gradient(135deg, rgba(22,163,74,0.08), rgba(0,230,118,0.04));
          border: 1px solid rgba(0,230,118,0.15);
          border-radius: 12px; padding: 14px 16px;
          margin-bottom: 14px;
          display: flex; align-items: center; gap: 12px;
        }

        .child-avatar {
          width: 42px; height: 42px; border-radius: 10px;
          background: rgba(0,230,118,0.1); border: 1px solid rgba(0,230,118,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        }

        .child-name { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
        .child-class { font-size: 11px; color: var(--green-text); font-family: var(--mono); }
      `}</style>

      <div className="parent-shell">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-logo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7 12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z"/>
              </svg>
            </div>
            <div className="topbar-info">
              <div className="topbar-title">My Child's Attendance</div>
              <div className="topbar-sub" style={{ textTransform: 'capitalize' }}>{schoolName || school_slug?.replace(/-/g, ' ')}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>

        <div className="content">
          {/* Children */}
          {students.map(s => (
            <div key={s.id} className="child-card">
              <div className="child-avatar">🎓</div>
              <div>
                <div className="child-name">{s.full_name}</div>
                <div className="child-class">{s.class}</div>
              </div>
            </div>
          ))}

          {students.length > 1 && (
            <div className="children-row">
              <button className={`child-chip ${selectedStudent === 'all' ? 'active' : ''}`} onClick={() => setSelectedStudent('all')}>All children</button>
              {students.map(s => (
                <button key={s.id} className={`child-chip ${selectedStudent === s.id ? 'active' : ''}`} onClick={() => setSelectedStudent(s.id)}>
                  {s.full_name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-label">Total</div>
              <div className="stat-val">{stats.total}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">On Time</div>
              <div className="stat-val" style={{ color: '#4ade80' }}>{stats.onTime}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Late</div>
              <div className="stat-val" style={{ color: stats.late > 0 ? '#fbbf24' : 'var(--muted2)' }}>{stats.late}</div>
            </div>
          </div>

          {/* Today */}
          {todayLogs.length > 0 && (
            <>
              <div className="section-header">
                <span className="section-title">Today</span>
                <span className="section-count">{todayLogs.length} scan{todayLogs.length !== 1 ? 's' : ''}</span>
              </div>
              {todayLogs.map(log => (
                <div key={log.id} className="log-item">
                  <span className="log-dot" style={{ background: log.is_late ? '#fbbf24' : '#00e676' }} />
                  <div className="log-main">
                    <div className="log-student">{log.students?.full_name}</div>
                    <div className="log-time">{format(new Date(log.scanned_at), 'h:mm a')} · {log.students?.class}</div>
                    {log.is_late && log.late_reason && <div className="log-reason">Reason: {log.late_reason}</div>}
                  </div>
                  <span className="log-badge" style={log.is_late ? { background: 'rgba(255,211,42,0.08)', color: '#fbbf24', border: '1px solid rgba(255,211,42,0.15)' } : { background: 'rgba(0,230,118,0.08)', color: '#4ade80', border: '1px solid rgba(0,230,118,0.15)' }}>
                    {log.is_late ? 'LATE' : 'ON TIME'}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* History */}
          <div className="section-header" style={{ marginTop: todayLogs.length > 0 ? 16 : 0 }}>
            <span className="section-title">Recent History</span>
            <span className="section-count">{filteredLogs.filter(l => !todayLogs.includes(l)).length} records</span>
          </div>

          {filteredLogs.filter(l => !todayLogs.includes(l)).length === 0 ? (
            <div className="empty-state">NO_RECORDS_YET</div>
          ) : (
            filteredLogs.filter(l => !todayLogs.includes(l)).map(log => (
              <div key={log.id} className="log-item">
                <span className="log-dot" style={{ background: log.is_late ? '#fbbf24' : '#4ade80' }} />
                <div className="log-main">
                  <div className="log-student">{log.students?.full_name}</div>
                  <div className="log-time">
                    {format(new Date(log.scanned_at), 'EEEE, MMM d · h:mm a')}
                  </div>
                  {log.is_late && log.late_reason && <div className="log-reason">Reason: {log.late_reason}</div>}
                </div>
                <span className="log-badge" style={log.is_late ? { background: 'rgba(255,211,42,0.08)', color: '#fbbf24', border: '1px solid rgba(255,211,42,0.15)' } : { background: 'rgba(0,230,118,0.08)', color: '#4ade80', border: '1px solid rgba(0,230,118,0.15)' }}>
                  {log.is_late ? 'LATE' : 'ON TIME'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}