import { createClient } from '@/lib/supabase/server'
import { format, subDays } from 'date-fns'
import { notFound } from 'next/navigation'
import { TrendingUp, Clock, Users, BarChart2, AlertCircle } from 'lucide-react'

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ school_slug: string }>
}) {
  const { school_slug } = await params
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', school_slug)
    .single()

  if (!school) notFound()

  const schoolId = school.id

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return format(d, 'yyyy-MM-dd')
  })

  const { data: allLogs } = await supabase
    .from('attendance_logs')
    .select('scanned_at, is_late')
    .eq('school_id', schoolId)
    .eq('scan_type', 'entry')
    .gte('scanned_at', `${last7Days[0]}T00:00:00`)
    .lte('scanned_at', `${last7Days[6]}T23:59:59`)

  const logMap = new Map<string, { present: number, late: number }>()
  allLogs?.forEach(log => {
    const date = format(new Date(log.scanned_at), 'yyyy-MM-dd')
    if (!logMap.has(date)) {
      logMap.set(date, { present: 0, late: 0 })
    }
    const entry = logMap.get(date)!
    entry.present++
    if (log.is_late) entry.late++
  })

  const dailyStats = last7Days.map(day => {
    const stats = logMap.get(day) || { present: 0, late: 0 }
    return {
      date: day,
      label: format(new Date(day + 'T12:00:00'), 'EEE'),
      shortDate: format(new Date(day + 'T12:00:00'), 'MMM d'),
      present: stats.present,
      late: stats.late,
    }
  })

  const { data: recentLate } = await supabase
    .from('attendance_logs')
    .select(`
      id, scanned_at, late_reason, scanned_by_name,
      students (full_name, class)
    `)
    .eq('school_id', schoolId)
    .eq('scan_type', 'entry')
    .eq('is_late', true)
    .order('scanned_at', { ascending: false })
    .limit(10)

  const maxPresent = Math.max(...dailyStats.map(d => d.present), 1)
  const totalWeek = dailyStats.reduce((a, d) => a + d.present, 0)
  const totalLate = dailyStats.reduce((a, d) => a + d.late, 0)
  const avgDaily = Math.round(totalWeek / 7)
  const todayStats = dailyStats[dailyStats.length - 1]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        .rp-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .rp-title {
          font-size: 22px;
          font-weight: 600;
          color: #e2ece6;
          letter-spacing: -0.5px;
          font-family: 'IBM Plex Sans', sans-serif;
        }
        .rp-sub {
          font-size: 11px;
          color: #5a7060;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-top: 3px;
        }
        .rp-period-badge {
          font-size: 10px;
          font-family: 'IBM Plex Mono', monospace;
          color: #4ade80;
          background: rgba(0,230,118,0.06);
          border: 1px solid rgba(0,230,118,0.15);
          padding: 6px 12px;
          border-radius: 5px;
          letter-spacing: 0.5px;
        }

        .rp-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        @media (max-width: 600px) { .rp-stats-row { grid-template-columns: 1fr 1fr; } }

        .rp-stat {
          background: #0d1410;
          border: 1px solid #1a2420;
          border-radius: 10px;
          padding: 16px;
          position: relative;
          overflow: hidden;
        }
        .rp-stat::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--accent, #00e676);
          opacity: 0.5;
        }
        .rp-stat-icon {
          width: 28px; height: 28px;
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        .rp-stat-val {
          font-size: 24px;
          font-weight: 600;
          font-family: 'IBM Plex Mono', monospace;
          color: #e2ece6;
          letter-spacing: -1px;
          line-height: 1;
          margin-bottom: 3px;
        }
        .rp-stat-label {
          font-size: 11px;
          color: #5a7060;
        }

        .rp-chart-panel {
          background: #0d1410;
          border: 1px solid #1a2420;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .rp-panel-header {
          padding: 14px 20px;
          border-bottom: 1px solid #1a2420;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .rp-panel-title {
          font-size: 11px;
          font-weight: 600;
          font-family: 'IBM Plex Mono', monospace;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #e2ece6;
        }
        .rp-panel-meta {
          font-size: 10px;
          font-family: 'IBM Plex Mono', monospace;
          color: #3a4e40;
        }

        .rp-chart {
          padding: 24px 20px 16px;
        }
        .rp-bars {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          height: 120px;
          margin-bottom: 12px;
        }
        .rp-bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          gap: 2px;
          justify-content: flex-end;
        }
        .rp-bar-late {
          width: 100%;
          background: rgba(255,211,42,0.5);
          border-radius: 3px 3px 0 0;
          min-height: 0;
          transition: height 0.3s ease;
        }
        .rp-bar-ontime {
          width: 100%;
          background: rgba(0,230,118,0.5);
          border-radius: 3px 3px 0 0;
          min-height: 0;
          transition: height 0.3s ease;
        }
        .rp-bar-label {
          font-size: 10px;
          font-family: 'IBM Plex Mono', monospace;
          color: #3a4e40;
          margin-top: 8px;
          text-transform: uppercase;
        }
        .rp-bar-count {
          font-size: 10px;
          font-family: 'IBM Plex Mono', monospace;
          color: #5a7060;
        }
        .rp-legend {
          display: flex;
          gap: 16px;
          padding-top: 12px;
          border-top: 1px solid #1a2420;
        }
        .rp-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #5a7060;
          font-family: 'IBM Plex Mono', monospace;
        }
        .rp-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }

        .rp-two-col {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 16px;
        }
        @media (max-width: 900px) { .rp-two-col { grid-template-columns: 1fr; } }

        .rp-late-list { }
        .rp-late-row {
          padding: 13px 20px;
          border-bottom: 1px solid #111c14;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transition: background 0.15s;
        }
        .rp-late-row:last-child { border-bottom: none; }
        .rp-late-row:hover { background: rgba(255,255,255,0.01); }
        .rp-late-dot {
          width: 6px; height: 6px; min-width: 6px;
          border-radius: 50%;
          background: #ffd32a;
          margin-top: 5px;
          flex-shrink: 0;
        }
        .rp-late-name {
          font-size: 13px;
          font-weight: 500;
          color: #c8dcc8;
          margin-bottom: 2px;
        }
        .rp-late-meta {
          font-size: 11px;
          color: #3a4e40;
          font-family: 'IBM Plex Mono', monospace;
        }
        .rp-late-reason {
          font-size: 11px;
          color: #fbbf24;
          margin-top: 3px;
          font-style: italic;
        }
        .rp-late-time {
          font-size: 11px;
          color: #3a4e40;
          font-family: 'IBM Plex Mono', monospace;
          white-space: nowrap;
          margin-left: auto;
        }

        .rp-summary-panel { }
        .rp-sum-row {
          padding: 13px 20px;
          border-bottom: 1px solid #111c14;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .rp-sum-row:last-child { border-bottom: none; }
        .rp-sum-label { font-size: 12px; color: #5a7060; }
        .rp-sum-val {
          font-size: 14px;
          font-weight: 600;
          font-family: 'IBM Plex Mono', monospace;
          color: #e2ece6;
        }

        .rp-day-breakdown {
          padding: 4px 0;
        }
        .rp-day-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 20px;
          border-bottom: 1px solid #0d1410;
        }
        .rp-day-row:last-child { border-bottom: none; }
        .rp-day-label {
          font-size: 11px;
          font-family: 'IBM Plex Mono', monospace;
          color: #3a4e40;
          width: 28px;
        }
        .rp-day-bar-bg {
          flex: 1;
          height: 4px;
          background: #1a2420;
          border-radius: 2px;
          overflow: hidden;
        }
        .rp-day-bar-fill {
          height: 100%;
          background: rgba(0,230,118,0.5);
          border-radius: 2px;
        }
        .rp-day-count {
          font-size: 11px;
          font-family: 'IBM Plex Mono', monospace;
          color: #4ade80;
          width: 24px;
          text-align: right;
        }

        .rp-empty {
          padding: 40px 20px;
          text-align: center;
          color: #3a4e40;
          font-size: 11px;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 1px;
        }
      `}</style>

      <div className="rp-header">
        <div>
          <div className="rp-title">Reports</div>
          <div className="rp-sub">7-day attendance overview</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div className="rp-period-badge">
            {format(subDays(new Date(), 6), 'MMM d')} — {format(new Date(), 'MMM d, yyyy')}
          </div>
          <a
            href={`/api/export-attendance?from=${format(subDays(new Date(), 6), 'yyyy-MM-dd')}&to=${format(new Date(), 'yyyy-MM-dd')}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#4ade80',
              background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.15)',
              padding: '6px 12px', borderRadius: 5, textDecoration: 'none',
            }}
            download
          >
            Export 7-day CSV
          </a>
        </div>
      </div>

      {/* Stats row */}
      <div className="rp-stats-row">
        <div className="rp-stat" style={{ '--accent': '#00e676' } as any}>
          <div className="rp-stat-icon" style={{ background: 'rgba(0,230,118,0.08)' }}>
            <Users size={14} color="#4ade80" />
          </div>
          <div className="rp-stat-val">{totalWeek}</div>
          <div className="rp-stat-label">Total scans this week</div>
        </div>
        <div className="rp-stat" style={{ '--accent': '#ffd32a' } as any}>
          <div className="rp-stat-icon" style={{ background: 'rgba(255,211,42,0.08)' }}>
            <Clock size={14} color="#fbbf24" />
          </div>
          <div className="rp-stat-val">{totalLate}</div>
          <div className="rp-stat-label">Late arrivals this week</div>
        </div>
        <div className="rp-stat" style={{ '--accent': '#5352ed' } as any}>
          <div className="rp-stat-icon" style={{ background: 'rgba(83,82,237,0.08)' }}>
            <TrendingUp size={14} color="#818cf8" />
          </div>
          <div className="rp-stat-val">{avgDaily}</div>
          <div className="rp-stat-label">Daily average scans</div>
        </div>
      </div>

      {/* Chart */}
      <div className="rp-chart-panel">
        <div className="rp-panel-header">
          <span className="rp-panel-title">Daily Attendance</span>
          <span className="rp-panel-meta">last 7 days</span>
        </div>
        <div className="rp-chart">
          <div className="rp-bars">
            {dailyStats.map(day => (
              <div key={day.date} className="rp-bar-col">
                <div className="rp-bar-count">{day.present > 0 ? day.present : ''}</div>
                {day.late > 0 && (
                  <div
                    className="rp-bar-late"
                    style={{ height: `${(day.late / maxPresent) * 80}px` }}
                  />
                )}
                {(day.present - day.late) > 0 && (
                  <div
                    className="rp-bar-ontime"
                    style={{ height: `${((day.present - day.late) / maxPresent) * 80}px` }}
                  />
                )}
                {day.present === 0 && (
                  <div style={{ height: 4, width: '100%', background: '#1a2420', borderRadius: 2 }} />
                )}
                <div className="rp-bar-label">{day.label}</div>
              </div>
            ))}
          </div>
          <div className="rp-legend">
            <div className="rp-legend-item">
              <div className="rp-legend-dot" style={{ background: 'rgba(0,230,118,0.5)' }} />
              On Time
            </div>
            <div className="rp-legend-item">
              <div className="rp-legend-dot" style={{ background: 'rgba(255,211,42,0.5)' }} />
              Late
            </div>
          </div>
        </div>
      </div>

      <div className="rp-two-col">
        {/* Late arrivals list */}
        <div className="rp-chart-panel">
          <div className="rp-panel-header">
            <span className="rp-panel-title">Recent Late Arrivals</span>
            <span className="rp-panel-meta">{recentLate?.length ?? 0} records</span>
          </div>
          {recentLate && recentLate.length > 0 ? (
            <div className="rp-late-list">
              {recentLate.map((log: any) => (
                <div key={log.id} className="rp-late-row">
                  <span className="rp-late-dot" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rp-late-name">{log.students?.full_name}</div>
                    <div className="rp-late-meta">{log.students?.class} · {log.scanned_by_name}</div>
                    {log.late_reason && (
                      <div className="rp-late-reason">"{log.late_reason}"</div>
                    )}
                  </div>
                  <div className="rp-late-time">
                    {format(new Date(log.scanned_at), 'MMM d')}<br />
                    <span style={{ color: '#5a7060' }}>{format(new Date(log.scanned_at), 'h:mm a')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rp-empty">NO_LATE_ARRIVALS_YET</div>
          )}
        </div>

        {/* Summary panel */}
        <div>
          <div className="rp-chart-panel" style={{ marginBottom: 12 }}>
            <div className="rp-panel-header">
              <span className="rp-panel-title">Week Summary</span>
            </div>
            <div className="rp-summary-panel">
              {[
                { label: 'Total Scans', val: totalWeek },
                { label: 'On Time', val: totalWeek - totalLate, color: '#4ade80' },
                { label: 'Late Arrivals', val: totalLate, color: totalLate > 0 ? '#fbbf24' : undefined },
                { label: 'Daily Average', val: avgDaily },
                { label: 'Best Day', val: `${Math.max(...dailyStats.map(d => d.present))} scans` },
                { label: 'Today', val: `${todayStats.present} scans`, color: '#4ade80' },
              ].map(({ label, val, color }) => (
                <div key={label} className="rp-sum-row">
                  <span className="rp-sum-label">{label}</span>
                  <span className="rp-sum-val" style={color ? { color } : undefined}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rp-chart-panel">
            <div className="rp-panel-header">
              <span className="rp-panel-title">Day Breakdown</span>
            </div>
            <div className="rp-day-breakdown">
              {dailyStats.map(day => (
                <div key={day.date} className="rp-day-row">
                  <span className="rp-day-label">{day.label}</span>
                  <div className="rp-day-bar-bg">
                    <div
                      className="rp-day-bar-fill"
                      style={{ width: `${(day.present / maxPresent) * 100}%` }}
                    />
                  </div>
                  <span className="rp-day-count">{day.present}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}