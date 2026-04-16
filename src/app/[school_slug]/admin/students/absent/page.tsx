import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import { UserX, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function AbsentTodayPage({
  params,
}: {
  params: Promise<{ school_slug: string }>
}) {
  const { school_slug } = await params
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('id, name')
    .eq('slug', school_slug)
    .single()

  if (!school) notFound()

  const today = format(new Date(), 'yyyy-MM-dd')
  const schoolId = school.id

  // Get all active students
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, full_name, class, parent_phone')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('class')
    .order('full_name')

  // Get student IDs who were scanned today
  const { data: scannedLogs } = await supabase
    .from('attendance_logs')
    .select('student_id')
    .eq('school_id', schoolId)
    .eq('scan_type', 'entry')
    .gte('scanned_at', `${today}T00:00:00`)
    .lte('scanned_at', `${today}T23:59:59`)

  const scannedIds = new Set((scannedLogs ?? []).map((l: any) => l.student_id))
  const absentStudents = (allStudents ?? []).filter(s => !scannedIds.has(s.id))

  // Group by class
  const byClass: Record<string, typeof absentStudents> = {}
  for (const s of absentStudents) {
    if (!byClass[s.class]) byClass[s.class] = []
    byClass[s.class].push(s)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        .abs-wrap { font-family: 'IBM Plex Sans', sans-serif; color: #e2ece6; }
        .abs-header {
          display: flex; align-items: center; gap: 14px; margin-bottom: 28px; flex-wrap: wrap;
        }
        .back-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 7px;
          border: 1px solid #243028; background: transparent;
          color: #5a7060; cursor: pointer; text-decoration: none; transition: all 0.15s;
        }
        .back-btn:hover { background: rgba(0,230,118,0.08); color: #e2ece6; }
        .abs-title { font-size: 22px; font-weight: 600; letter-spacing: -0.5px; }
        .abs-date { font-size: 11px; color: #5a7060; font-family: 'IBM Plex Mono', monospace; letter-spacing: 1px; text-transform: uppercase; margin-top: 3px; }

        .abs-summary {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;
        }
        @media (max-width: 600px) { .abs-summary { grid-template-columns: 1fr 1fr; } }

        .sum-card {
          background: #0d1410; border: 1px solid #1a2420; border-radius: 10px; padding: 16px;
          position: relative; overflow: hidden;
        }
        .sum-card::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: var(--accent, #ff4757); opacity: 0.5;
        }
        .sum-val { font-size: 28px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; letter-spacing: -1px; line-height: 1; margin-bottom: 4px; }
        .sum-label { font-size: 11px; color: #5a7060; }

        .class-section { margin-bottom: 20px; }
        .class-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px; background: #0d1410; border: 1px solid #1a2420;
          border-radius: 8px 8px 0 0; border-bottom: none;
        }
        .class-name { font-size: 12px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; color: #e2ece6; text-transform: uppercase; letter-spacing: 1px; }
        .class-count { font-size: 11px; font-family: 'IBM Plex Mono', monospace; color: #3a4e40; }

        .student-list { background: #0d1410; border: 1px solid #1a2420; border-radius: 0 0 8px 8px; overflow: hidden; }
        .student-row {
          padding: 11px 16px; border-bottom: 1px solid #111c14;
          display: flex; align-items: center; gap: 12px; transition: background 0.15s;
        }
        .student-row:last-child { border-bottom: none; }
        .student-row:hover { background: rgba(255,255,255,0.015); }
        .student-dot { width: 6px; height: 6px; border-radius: 50%; background: #ff4757; flex-shrink: 0; }
        .student-name { font-size: 13px; font-weight: 500; color: #c8dcc8; flex: 1; }
        .student-phone { font-size: 11px; color: #3a4e40; font-family: 'IBM Plex Mono', monospace; }

        .empty-state {
          background: rgba(0,230,118,0.05); border: 1px solid rgba(0,230,118,0.12);
          border-radius: 12px; padding: 48px 24px; text-align: center;
        }
        .empty-icon { font-size: 32px; margin-bottom: 12px; }
        .empty-title { font-size: 16px; font-weight: 600; color: #4ade80; margin-bottom: 6px; }
        .empty-sub { font-size: 12px; color: #5a7060; font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <div className="abs-wrap">
        <div className="abs-header">
          <Link href={`/${school_slug}/admin/dashboard`} className="back-btn">
            <ArrowLeft size={15} />
          </Link>
          <div>
            <div className="abs-title">Absent Students</div>
            <div className="abs-date">{format(new Date(), 'EEEE · MMMM d, yyyy')} · Not yet scanned</div>
          </div>
        </div>

        <div className="abs-summary">
          <div className="sum-card" style={{ '--accent': '#ff4757' } as any}>
            <div className="sum-val" style={{ color: '#f87171' }}>{absentStudents.length}</div>
            <div className="sum-label">Not yet scanned today</div>
          </div>
          <div className="sum-card" style={{ '--accent': '#00e676' } as any}>
            <div className="sum-val" style={{ color: '#4ade80' }}>{scannedIds.size}</div>
            <div className="sum-label">Scanned in today</div>
          </div>
          <div className="sum-card" style={{ '--accent': '#5352ed' } as any}>
            <div className="sum-val" style={{ color: '#818cf8' }}>{allStudents?.length ?? 0}</div>
            <div className="sum-label">Total enrolled</div>
          </div>
        </div>

        {absentStudents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <div className="empty-title">Everyone's here!</div>
            <div className="empty-sub">All active students have been scanned today.</div>
          </div>
        ) : (
          Object.entries(byClass).sort(([a], [b]) => a.localeCompare(b)).map(([cls, students]) => (
            <div key={cls} className="class-section">
              <div className="class-header">
                <span className="class-name">{cls}</span>
                <span className="class-count">{students.length} absent</span>
              </div>
              <div className="student-list">
                {students.map(s => (
                  <div key={s.id} className="student-row">
                    <span className="student-dot" />
                    <span className="student-name">{s.full_name}</span>
                    <span className="student-phone">{s.parent_phone}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}