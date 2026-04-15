import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Clock, Users } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function TeacherAttendancePage({
  params,
}: {
  params: Promise<{ school_slug: string }>
}) {
  const { school_slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('school_id, full_name')
    .eq('user_id', user.id)
    .single()

  if (!profile) notFound()

  const schoolId = profile.school_id
  const { data: myClasses } = await supabase
    .from('teacher_classes')
    .select('class_name')
    .eq('teacher_id', user.id)
    .eq('school_id', schoolId)

  const classNames = myClasses?.map(c => c.class_name) ?? []
  const today = format(new Date(), 'yyyy-MM-dd')

  let query = supabase
    .from('attendance_logs')
    .select(`id, scan_type, scanned_at, is_late, late_reason, scanned_by_name, students (full_name, class)`)
    .eq('school_id', schoolId)
    .eq('scan_type', 'entry')
    .gte('scanned_at', `${today}T00:00:00`)
    .order('scanned_at', { ascending: false })
    .limit(classNames.length > 0 ? 200 : 100)

  const { data: logs } = await query
  const filtered = classNames.length > 0
    ? logs?.filter((l: any) => classNames.includes(l.students?.class))
    : logs

  const onTimeCount = filtered?.filter((l: any) => !l.is_late).length ?? 0
  const lateCount = filtered?.filter((l: any) => l.is_late).length ?? 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        :root {
          --bg: #080c0a; --surface: #0d1410; --border: #1a2420;
          --green: #00e676; --green-text: #4ade80; --text: #e2ece6;
          --muted: #5a7060; --muted2: #3a4e40;
          --yellow: #ffd32a; --mono: 'IBM Plex Mono', monospace;
          --sans: 'IBM Plex Sans', sans-serif;
        }

        .ta-shell {
          min-height: 100vh;
          background: var(--bg);
          font-family: var(--sans);
          color: var(--text);
          padding-bottom: 80px;
        }

        .ta-topbar {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 0 16px;
          height: 52px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .ta-back {
          width: 32px; height: 32px;
          border-radius: 7px;
          border: 1px solid #243028;
          background: transparent;
          color: #5a7060;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .ta-back:hover { background: rgba(0,230,118,0.08); color: var(--text); border-color: rgba(0,230,118,0.2); }

        .ta-top-info { flex: 1; }
        .ta-top-title { font-size: 14px; font-weight: 600; color: var(--text); line-height: 1.2; }
        .ta-top-sub { font-size: 10px; color: var(--muted); font-family: var(--mono); }

        .ta-body {
          max-width: 460px;
          margin: 0 auto;
          padding: 16px;
        }

        .ta-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .ta-stat {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 12px 14px;
        }
        .ta-stat-label {
          font-size: 9px;
          font-family: var(--mono);
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--muted2);
          margin-bottom: 4px;
        }
        .ta-stat-val {
          font-size: 22px;
          font-weight: 600;
          font-family: var(--mono);
          color: var(--text);
          letter-spacing: -1px;
        }

        .ta-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        .ta-panel-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ta-panel-title {
          font-size: 11px;
          font-family: var(--mono);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--text);
          font-weight: 600;
        }
        .ta-panel-count {
          font-size: 10px;
          font-family: var(--mono);
          color: var(--muted2);
        }

        .ta-log {
          padding: 12px 16px;
          border-bottom: 1px solid #111c14;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background 0.15s;
        }
        .ta-log:last-child { border-bottom: none; }
        .ta-log:hover { background: rgba(255,255,255,0.01); }

        .ta-log-dot {
          width: 6px; height: 6px; min-width: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .ta-log-name {
          font-size: 13px;
          font-weight: 500;
          color: #c8dcc8;
          margin-bottom: 2px;
        }
        .ta-log-meta {
          font-size: 10px;
          color: var(--muted2);
          font-family: var(--mono);
        }
        .ta-log-reason {
          font-size: 10px;
          color: #fbbf24;
          margin-top: 2px;
          font-style: italic;
        }
        .ta-badge {
          font-size: 10px;
          font-family: var(--mono);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .ta-time {
          font-size: 11px;
          font-family: var(--mono);
          color: var(--muted2);
          white-space: nowrap;
        }

        .ta-empty {
          padding: 48px 20px;
          text-align: center;
          color: var(--muted2);
          font-size: 11px;
          font-family: var(--mono);
          letter-spacing: 1px;
        }
      `}</style>

      <div className="ta-shell">
        <div className="ta-topbar">
          <Link href={`/${school_slug}/teacher/scan`} className="ta-back">
            <ArrowLeft size={15} />
          </Link>
          <div className="ta-top-info">
            <div className="ta-top-title">Today's Attendance</div>
            <div className="ta-top-sub">{format(new Date(), 'EEEE · MMM d')}</div>
          </div>
        </div>

        <div className="ta-body">
          <div className="ta-stats">
            <div className="ta-stat">
              <div className="ta-stat-label">Total</div>
              <div className="ta-stat-val" style={{ color: '#e2ece6' }}>{filtered?.length ?? 0}</div>
            </div>
            <div className="ta-stat">
              <div className="ta-stat-label">On Time</div>
              <div className="ta-stat-val" style={{ color: '#4ade80' }}>{onTimeCount}</div>
            </div>
            <div className="ta-stat">
              <div className="ta-stat-label">Late</div>
              <div className="ta-stat-val" style={{ color: lateCount > 0 ? '#fbbf24' : '#3a4e40' }}>{lateCount}</div>
            </div>
          </div>

          <div className="ta-panel">
            <div className="ta-panel-header">
              <span className="ta-panel-title">Scanned Today</span>
              <span className="ta-panel-count">{filtered?.length ?? 0} records</span>
            </div>

            {filtered && filtered.length > 0 ? (
              filtered.map((log: any) => (
                <div key={log.id} className="ta-log">
                  <span className="ta-log-dot" style={{ background: log.is_late ? '#ffd32a' : '#00e676' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ta-log-name">{log.students?.full_name}</div>
                    <div className="ta-log-meta">{log.students?.class}</div>
                    {log.is_late && log.late_reason && (
                      <div className="ta-log-reason">"{log.late_reason}"</div>
                    )}
                  </div>
                  <span
                    className="ta-badge"
                    style={log.is_late
                      ? { background: 'rgba(255,211,42,0.08)', color: '#fbbf24', border: '1px solid rgba(255,211,42,0.15)' }
                      : { background: 'rgba(0,230,118,0.08)', color: '#4ade80', border: '1px solid rgba(0,230,118,0.15)' }
                    }
                  >
                    {log.is_late ? 'LATE' : 'ON TIME'}
                  </span>
                  <span className="ta-time">{format(new Date(log.scanned_at), 'h:mm a')}</span>
                </div>
              ))
            ) : (
              <div className="ta-empty">NO_SCANS_YET_TODAY</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}