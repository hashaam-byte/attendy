import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { Users, UserCheck, UserX, Clock, TrendingUp, Download } from 'lucide-react'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ school_slug: string }>
}) {
  const { school_slug } = await params
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('id, name, plan')
    .eq('slug', school_slug)
    .single()

  if (!school) notFound()

  const today = format(new Date(), 'yyyy-MM-dd')
  const schoolId = school.id

  const [studentsRes, presentRes, lateRes] = await Promise.all([
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('school_id', schoolId),
    supabase
      .from('attendance_logs')
      .select('id', { count: 'exact', head: true })
      .eq('scan_type', 'entry')
      .eq('school_id', schoolId)
      .gte('scanned_at', `${today}T00:00:00`)
      .lte('scanned_at', `${today}T23:59:59`),
    supabase
      .from('attendance_logs')
      .select('id', { count: 'exact', head: true })
      .eq('scan_type', 'entry')
      .eq('is_late', true)
      .eq('school_id', schoolId)
      .gte('scanned_at', `${today}T00:00:00`)
      .lte('scanned_at', `${today}T23:59:59`),
  ])

  const totalStudents = studentsRes.count ?? 0
  const presentToday = presentRes.count ?? 0
  const lateToday = lateRes.count ?? 0
  const absentToday = Math.max(0, totalStudents - presentToday)
  const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0

  const { data: recentLogs } = await supabase
    .from('attendance_logs')
    .select(`id, scan_type, scanned_at, is_late, scanned_by_name, students (full_name, class)`)
    .eq('school_id', schoolId)
    .gte('scanned_at', `${today}T00:00:00`)
    .order('scanned_at', { ascending: false })
    .limit(8)

  const colorMap: Record<string, { bg: string, text: string, dot: string }> = {
    blue:   { bg: 'rgba(83,82,237,0.08)', text: '#818cf8', dot: '#5352ed' },
    green:  { bg: 'rgba(0,230,118,0.08)', text: '#4ade80', dot: '#00e676' },
    red:    { bg: 'rgba(255,71,87,0.08)', text: '#f87171', dot: '#ff4757' },
    yellow: { bg: 'rgba(255,211,42,0.08)', text: '#fbbf24', dot: '#ffd32a' },
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        .dash-header { margin-bottom: 28px; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .dash-title { font-size: 22px; font-weight: 600; color: #e2ece6; letter-spacing: -0.5px; font-family: 'IBM Plex Sans', sans-serif; margin-bottom: 4px; }
        .dash-date { font-size: 11px; color: #5a7060; font-family: 'IBM Plex Mono', monospace; letter-spacing: 1px; text-transform: uppercase; }
        .dash-rate { display: flex; align-items: center; gap: 8px; font-size: 11px; font-family: 'IBM Plex Mono', monospace; color: #4ade80; background: rgba(0,230,118,0.06); border: 1px solid rgba(0,230,118,0.15); padding: 6px 12px; border-radius: 5px; }

        .header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .export-btn { display: flex; align-items: center; gap: 6px; font-size: 10px; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.5px; color: #5a7060; background: transparent; border: 1px solid #243028; padding: 6px 12px; border-radius: 5px; text-decoration: none; transition: all 0.15s; }
        .export-btn:hover { color: #4ade80; border-color: rgba(0,230,118,0.2); background: rgba(0,230,118,0.05); }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        @media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .stats-grid { grid-template-columns: 1fr 1fr; } }

        .stat-card { background: #0d1410; border: 1px solid #1a2420; border-radius: 10px; padding: 18px 16px; position: relative; overflow: hidden; transition: border-color 0.2s; cursor: default; }
        .stat-card.clickable { cursor: pointer; text-decoration: none; display: block; }
        .stat-card:hover { border-color: #243028; }
        .stat-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--stat-color, #00e676); opacity: 0.6; }
        .stat-icon-wrap { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .stat-value { font-size: 28px; font-weight: 600; color: #e2ece6; font-family: 'IBM Plex Mono', monospace; letter-spacing: -1px; line-height: 1; margin-bottom: 4px; }
        .stat-label { font-size: 12px; font-weight: 500; color: #5a7060; margin-bottom: 2px; }
        .stat-sub { font-size: 10px; color: #3a4e40; font-family: 'IBM Plex Mono', monospace; }
        .stat-drill { font-size: 10px; color: #5a7060; font-family: 'IBM Plex Mono', monospace; margin-top: 4px; }
        .stat-card.clickable:hover .stat-drill { color: #4ade80; }

        .dash-grid { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
        @media (max-width: 900px) { .dash-grid { grid-template-columns: 1fr; } }

        .panel { background: #0d1410; border: 1px solid #1a2420; border-radius: 10px; overflow: hidden; }
        .panel-header { padding: 14px 18px; border-bottom: 1px solid #1a2420; display: flex; align-items: center; justify-content: space-between; }
        .panel-title { font-size: 12px; font-weight: 600; color: #e2ece6; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.5px; text-transform: uppercase; }
        .panel-count { font-size: 11px; font-family: 'IBM Plex Mono', monospace; color: #3a4e40; }

        .log-row { padding: 12px 18px; border-bottom: 1px solid #111c14; display: flex; align-items: center; gap: 12px; transition: background 0.15s; }
        .log-row:last-child { border-bottom: none; }
        .log-row:hover { background: rgba(255,255,255,0.015); }
        .log-dot { width: 6px; height: 6px; min-width: 6px; border-radius: 50%; flex-shrink: 0; }
        .log-name { font-size: 13px; font-weight: 500; color: #c8dcc8; flex: 1; }
        .log-class { font-size: 11px; color: #3a4e40; font-family: 'IBM Plex Mono', monospace; }
        .log-time { font-size: 11px; color: #3a4e40; font-family: 'IBM Plex Mono', monospace; white-space: nowrap; }
        .log-badge { font-size: 10px; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.5px; padding: 3px 8px; border-radius: 4px; white-space: nowrap; }

        .quick-stats { padding: 0; }
        .qs-row { padding: 14px 18px; border-bottom: 1px solid #111c14; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .qs-row:last-child { border-bottom: none; }
        .qs-label { font-size: 12px; color: #5a7060; }
        .qs-value { font-size: 14px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; color: #e2ece6; }

        .empty-state { padding: 40px 20px; text-align: center; color: #3a4e40; font-size: 12px; font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <div className="dash-header">
        <div>
          <div className="dash-title">Attendance Dashboard</div>
          <div className="dash-date">{format(new Date(), 'EEEE · MMMM d, yyyy')}</div>
        </div>
        <div className="header-actions">
          <a
            href={`/api/export-attendance?from=${today}&to=${today}`}
            className="export-btn"
            download
          >
            <Download size={11} />
            Export Today CSV
          </a>
          <div className="dash-rate">
            <TrendingUp size={12} />
            {attendanceRate}% attendance rate today
          </div>
        </div>
      </div>

      {/* Stats — Absent card is clickable drill-down */}
      <div className="stats-grid">
        {[
          { label: 'Total Students', value: totalStudents, icon: Users, color: 'blue', sub: 'enrolled', href: null },
          { label: 'Present Today', value: presentToday, icon: UserCheck, color: 'green', sub: `${attendanceRate}% rate`, href: null },
          { label: 'Absent Today', value: absentToday, icon: UserX, color: 'red', sub: 'not scanned', href: `/${school_slug}/admin/students/absent`, drill: 'Click to see who →' },
          { label: 'Late Today', value: lateToday, icon: Clock, color: 'yellow', sub: 'after cutoff', href: null },
        ].map(({ label, value, icon: Icon, color, sub, href, drill }) => {
          const c = colorMap[color]
          const card = (
            <div className={`stat-card ${href ? 'clickable' : ''}`} style={{ '--stat-color': c.dot } as any}>
              <div className="stat-icon-wrap" style={{ background: c.bg }}>
                <Icon size={15} color={c.text} />
              </div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
              <div className="stat-sub">{sub}</div>
              {drill && <div className="stat-drill">{drill}</div>}
            </div>
          )
          return href
            ? <Link key={label} href={href} style={{ textDecoration: 'none' }}>{card}</Link>
            : <div key={label}>{card}</div>
        })}
      </div>

      {/* Grid */}
      <div className="dash-grid">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Today's Scans</span>
            <span className="panel-count">{recentLogs?.length ?? 0} records</span>
          </div>
          {recentLogs && recentLogs.length > 0 ? (
            recentLogs.map((log: any) => (
              <div key={log.id} className="log-row">
                <span className="log-dot" style={{ background: log.is_late ? '#ffd32a' : '#00e676' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="log-name">{log.students?.full_name}</div>
                  <div className="log-class">{log.students?.class} · {log.scanned_by_name}</div>
                </div>
                <span className="log-badge" style={{
                  background: log.is_late ? 'rgba(255,211,42,0.08)' : 'rgba(0,230,118,0.08)',
                  color: log.is_late ? '#fbbf24' : '#4ade80',
                  border: `1px solid ${log.is_late ? 'rgba(255,211,42,0.15)' : 'rgba(0,230,118,0.15)'}`,
                }}>
                  {log.is_late ? 'LATE' : 'ON TIME'}
                </span>
                <span className="log-time">{format(new Date(log.scanned_at), 'h:mm a')}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">NO_SCANS_YET — {format(new Date(), 'yyyy-MM-dd')}</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Summary</span>
          </div>
          <div className="quick-stats">
            {[
              { label: 'Attendance Rate', value: `${attendanceRate}%` },
              { label: 'Scanned In', value: presentToday },
              { label: 'Late Arrivals', value: lateToday },
              { label: 'Not Seen', value: absentToday },
              { label: 'Enrolled', value: totalStudents },
              { label: 'Plan', value: (school.plan ?? 'free').toUpperCase() },
            ].map(({ label, value }) => (
              <div key={label} className="qs-row">
                <span className="qs-label">{label}</span>
                <span className="qs-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}