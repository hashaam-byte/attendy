import { requireHeadAdmin } from '@/lib/head-admin/auth'
import HeadAdminNav from '../HeadAdminNav'
import { createClient } from '@supabase/supabase-js'
import { format, parseISO, isPast, isWithinInterval, addDays } from 'date-fns'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  basic: 120000,
  standard: 200000,
  pro: 350000,
}

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  free:     { bg: 'rgba(100,100,100,0.08)', text: '#9ca3af', border: 'rgba(100,100,100,0.15)' },
  basic:    { bg: 'rgba(83,82,237,0.08)',   text: '#818cf8', border: 'rgba(83,82,237,0.15)' },
  standard: { bg: 'rgba(0,230,118,0.08)',   text: '#4ade80', border: 'rgba(0,230,118,0.15)' },
  pro:      { bg: 'rgba(168,85,247,0.08)',  text: '#c084fc', border: 'rgba(168,85,247,0.15)' },
}

export default async function SubscriptionsPage() {
  const admin = await requireHeadAdmin()

  const { data: schools } = await supabaseAdmin
    .from('schools')
    .select('id, name, slug, plan, plan_expires_at, is_active, max_students, created_at')
    .order('plan_expires_at', { ascending: true, nullsFirst: false })

  const { data: recentLogs } = await supabaseAdmin
    .from('subscription_logs')
    .select('id, school_id, action, old_plan, new_plan, note, performed_by, created_at, schools(name,slug)')
    .order('created_at', { ascending: false })
    .limit(20)

  const now = new Date()

  const expired = schools?.filter(s => s.plan_expires_at && isPast(parseISO(s.plan_expires_at)) && s.is_active) ?? []
  const expiringSoon = schools?.filter(s => {
    if (!s.plan_expires_at) return false
    const exp = parseISO(s.plan_expires_at)
    return isWithinInterval(exp, { start: now, end: addDays(now, 14) })
  }) ?? []
  const active = schools?.filter(s => s.is_active) ?? []

  const totalRevenue = schools?.reduce((acc, s) => acc + (PLAN_PRICES[s.plan] ?? 0), 0) ?? 0
  const totalMRR = Math.round(totalRevenue / 12)

  const planDistribution = ['free', 'basic', 'standard', 'pro'].map(plan => ({
    plan,
    count: schools?.filter(s => s.plan === plan).length ?? 0,
  }))

  const actionColors: Record<string, string> = {
    activated: '#4ade80',
    suspended: '#f87171',
    deactivated: '#f87171',
    plan_changed: '#818cf8',
  }

  return (
    <div className="flex">
      <HeadAdminNav adminName={admin.email} />
      <main className="flex-1 ml-0 md:ml-60">
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
            --green-text: #4ade80;
            --text: #e2ece6;
            --muted: #5a7060;
            --muted2: #3a4e40;
            --mono: 'IBM Plex Mono', monospace;
            --sans: 'IBM Plex Sans', sans-serif;
          }

          .sub-page {
            background: var(--bg);
            min-height: 100vh;
            padding: 32px;
            font-family: var(--sans);
            color: var(--text);
          }
          @media (max-width: 768px) { .sub-page { padding: 16px; } }

          .sub-header {
            margin-bottom: 28px;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
          }
          .sub-title { font-size: 22px; font-weight: 600; letter-spacing: -0.5px; }
          .sub-sub { font-size: 11px; color: var(--muted); font-family: var(--mono); margin-top: 4px; }

          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          @media (max-width: 1024px) { .metrics-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 480px) { .metrics-grid { grid-template-columns: 1fr 1fr; } }

          .metric-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 18px;
            position: relative;
          }
          .metric-label { font-size: 11px; color: var(--muted); font-family: var(--mono); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 10px; }
          .metric-value { font-size: 26px; font-weight: 600; font-family: var(--mono); color: var(--text); letter-spacing: -1px; }
          .metric-sub { font-size: 10px; color: var(--muted2); font-family: var(--mono); margin-top: 4px; }

          .alert-banner {
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-family: var(--mono);
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 16px;
            line-height: 1.6;
          }
          .alert-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }

          .main-grid {
            display: grid;
            grid-template-columns: 1fr 340px;
            gap: 16px;
          }
          @media (max-width: 1100px) { .main-grid { grid-template-columns: 1fr; } }

          .panel {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 10px;
            overflow: hidden;
          }
          .panel-header {
            padding: 13px 18px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .panel-title {
            font-size: 11px;
            font-weight: 600;
            font-family: var(--mono);
            letter-spacing: 1px;
            text-transform: uppercase;
            color: var(--text);
          }
          .panel-meta { font-size: 10px; font-family: var(--mono); color: var(--muted2); }

          .school-row {
            padding: 12px 18px;
            border-bottom: 1px solid #111c14;
            display: grid;
            grid-template-columns: 1fr auto auto auto;
            align-items: center;
            gap: 12px;
            transition: background 0.15s;
          }
          .school-row:last-child { border-bottom: none; }
          .school-row:hover { background: rgba(255,255,255,0.01); }

          .school-name { font-size: 13px; font-weight: 500; color: #c8dcc8; }
          .school-slug { font-size: 10px; font-family: var(--mono); color: var(--muted2); margin-top: 1px; }

          .plan-badge {
            font-size: 10px;
            font-family: var(--mono);
            letter-spacing: 0.5px;
            text-transform: uppercase;
            padding: 3px 8px;
            border-radius: 4px;
            white-space: nowrap;
          }

          .exp-text {
            font-size: 10px;
            font-family: var(--mono);
            white-space: nowrap;
          }

          .status-dot {
            width: 6px; height: 6px;
            border-radius: 50%;
            flex-shrink: 0;
          }

          .manage-link {
            font-size: 10px;
            font-family: var(--mono);
            color: var(--muted);
            text-decoration: none;
            padding: 3px 8px;
            border: 1px solid var(--border2);
            border-radius: 4px;
            transition: all 0.15s;
            white-space: nowrap;
          }
          .manage-link:hover { color: #818cf8; border-color: rgba(83,82,237,0.3); background: rgba(83,82,237,0.06); }

          .dist-grid { padding: 16px 18px; }
          .dist-row { margin-bottom: 14px; }
          .dist-row:last-child { margin-bottom: 0; }
          .dist-labels { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .dist-plan-name { font-size: 11px; font-family: var(--mono); color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
          .dist-count { font-size: 11px; font-family: var(--mono); color: var(--text); }
          .dist-bar-bg { height: 4px; background: var(--border2); border-radius: 2px; overflow: hidden; }
          .dist-bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }

          .log-row {
            padding: 11px 18px;
            border-bottom: 1px solid #111c14;
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }
          .log-row:last-child { border-bottom: none; }
          .log-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
          .log-action { font-size: 12px; font-weight: 500; text-transform: uppercase; font-family: var(--mono); letter-spacing: 0.5px; }
          .log-note { font-size: 11px; color: var(--muted); margin-top: 1px; }
          .log-meta { font-size: 10px; color: var(--muted2); font-family: var(--mono); margin-left: auto; text-align: right; white-space: nowrap; }

          .empty-state { padding: 32px; text-align: center; color: var(--muted2); font-size: 11px; font-family: var(--mono); }

          .revenue-row {
            padding: 13px 18px;
            border-bottom: 1px solid #111c14;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .revenue-row:last-child { border-bottom: none; }
          .revenue-label { font-size: 12px; color: var(--muted); }
          .revenue-val { font-size: 14px; font-weight: 600; font-family: var(--mono); color: var(--text); }
        `}</style>

        <div className="sub-page">
          {/* Header */}
          <div className="sub-header">
            <div>
              <div className="sub-title">Subscriptions</div>
              <div className="sub-sub">Billing · Plans · Revenue Overview</div>
            </div>
          </div>

          {/* Metrics */}
          <div className="metrics-grid">
            {[
              { label: 'Total Schools', value: schools?.length ?? 0, sub: 'all time' },
              { label: 'Active', value: active.length, sub: 'currently live' },
              { label: 'Expiring ≤14d', value: expiringSoon.length, sub: 'need renewal', highlight: expiringSoon.length > 0 },
              { label: 'Expired', value: expired.length, sub: 'plan past due', highlight: expired.length > 0 },
            ].map(({ label, value, sub, highlight }) => (
              <div key={label} className="metric-card" style={{ borderColor: highlight && value > 0 ? 'rgba(255,71,87,0.25)' : undefined }}>
                <div className="metric-label">{label}</div>
                <div className="metric-value" style={{ color: highlight && value > 0 ? '#f87171' : undefined }}>
                  {value}
                </div>
                <div className="metric-sub">{sub}</div>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {expired.length > 0 && (
            <div className="alert-banner" style={{ background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.15)', color: '#fca5a5' }}>
              <span className="alert-dot" style={{ background: '#f87171' }} />
              <span>
                {expired.length} school{expired.length > 1 ? 's have' : ' has'} an expired plan but {expired.length > 1 ? 'are' : 'is'} still active:{' '}
                {expired.slice(0, 3).map(s => s.name).join(', ')}{expired.length > 3 ? `... +${expired.length - 3} more` : ''}.
                Renew or suspend from the Schools page.
              </span>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="alert-banner" style={{ background: 'rgba(255,211,42,0.05)', border: '1px solid rgba(255,211,42,0.12)', color: '#fbbf24' }}>
              <span className="alert-dot" style={{ background: '#ffd32a' }} />
              <span>
                {expiringSoon.length} school{expiringSoon.length > 1 ? 's expire' : ' expires'} within 14 days:{' '}
                {expiringSoon.map(s => s.name).join(', ')}.
              </span>
            </div>
          )}

          {/* Main layout */}
          <div className="main-grid">
            {/* Left col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* All schools subscriptions */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">All Subscriptions</span>
                  <span className="panel-meta">{schools?.length ?? 0} schools</span>
                </div>
                {schools && schools.length > 0 ? schools.map(school => {
                  const planC = PLAN_COLORS[school.plan] ?? PLAN_COLORS.free
                  const isExpired = school.plan_expires_at && isPast(parseISO(school.plan_expires_at))
                  const isSoon = school.plan_expires_at && !isExpired &&
                    isWithinInterval(parseISO(school.plan_expires_at), { start: now, end: addDays(now, 14) })

                  return (
                    <div key={school.id} className="school-row">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span className="status-dot" style={{ background: school.is_active ? '#00e676' : '#f87171' }} />
                          <div className="school-name">{school.name}</div>
                        </div>
                        <div className="school-slug">/{school.slug}</div>
                      </div>
                      <span
                        className="plan-badge"
                        style={{ background: planC.bg, color: planC.text, border: `1px solid ${planC.border}` }}
                      >
                        {school.plan}
                      </span>
                      <span className="exp-text" style={{
                        color: isExpired ? '#f87171' : isSoon ? '#fbbf24' : '#3a4e40',
                      }}>
                        {school.plan_expires_at
                          ? (isExpired ? '⚠ ' : isSoon ? '⏰ ' : '') + format(parseISO(school.plan_expires_at), 'MMM d, yyyy')
                          : '—'
                        }
                      </span>
                      <a href={`/head-admin/schools/${school.id}`} className="manage-link">
                        Manage →
                      </a>
                    </div>
                  )
                }) : (
                  <div className="empty-state">NO_SCHOOLS_FOUND</div>
                )}
              </div>

              {/* Activity log */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Subscription Activity</span>
                  <span className="panel-meta">last 20 events</span>
                </div>
                {recentLogs && recentLogs.length > 0 ? recentLogs.map((log: any) => (
                  <div key={log.id} className="log-row">
                    <span className="log-dot" style={{ background: actionColors[log.action] ?? '#5a7060' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="log-action" style={{ color: actionColors[log.action] ?? '#9ca3af' }}>
                        {log.action.replace('_', ' ')}
                      </div>
                      <div className="log-note">
                        {(log.schools as any)?.name ?? 'Unknown school'} — {log.note ?? ''}
                      </div>
                    </div>
                    <div className="log-meta">
                      {format(parseISO(log.created_at), 'MMM d')}<br />
                      <span style={{ color: '#1e3a28' }}>{log.performed_by?.split('@')[0]}</span>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state">NO_ACTIVITY_YET</div>
                )}
              </div>
            </div>

            {/* Right col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Revenue summary */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Revenue (Est.)</span>
                </div>
                {[
                  { label: 'Annual Revenue', value: `₦${totalRevenue.toLocaleString()}` },
                  { label: 'Monthly (ARR/12)', value: `₦${totalMRR.toLocaleString()}` },
                  { label: 'Paying Schools', value: schools?.filter(s => s.plan !== 'free').length ?? 0 },
                  { label: 'Free Tier', value: schools?.filter(s => s.plan === 'free').length ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="revenue-row">
                    <span className="revenue-label">{label}</span>
                    <span className="revenue-val">{value}</span>
                  </div>
                ))}
              </div>

              {/* Plan distribution */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Plan Distribution</span>
                </div>
                <div className="dist-grid">
                  {planDistribution.map(({ plan, count }) => {
                    const pct = schools?.length ? Math.round((count / schools.length) * 100) : 0
                    const planC = PLAN_COLORS[plan]
                    return (
                      <div key={plan} className="dist-row">
                        <div className="dist-labels">
                          <span className="dist-plan-name">{plan}</span>
                          <span className="dist-count">{count} · {pct}%</span>
                        </div>
                        <div className="dist-bar-bg">
                          <div
                            className="dist-bar-fill"
                            style={{ width: `${pct}%`, background: planC.text }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Price reference */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Plan Pricing</span>
                </div>
                {[
                  { plan: 'free', price: '₦0', students: '50 students' },
                  { plan: 'basic', price: '₦120,000', students: '200 students' },
                  { plan: 'standard', price: '₦200,000', students: '500 students' },
                  { plan: 'pro', price: '₦350,000', students: 'Unlimited' },
                ].map(({ plan, price, students }) => {
                  const planC = PLAN_COLORS[plan]
                  return (
                    <div key={plan} className="revenue-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="plan-badge" style={{ background: planC.bg, color: planC.text, border: `1px solid ${planC.border}` }}>
                          {plan}
                        </span>
                        <span style={{ fontSize: 10, color: '#3a4e40', fontFamily: 'IBM Plex Mono, monospace' }}>{students}</span>
                      </div>
                      <span className="revenue-val">{price}/yr</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}