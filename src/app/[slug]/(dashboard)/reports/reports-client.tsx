"use client";
// src/app/[slug]/(dashboard)/reports/reports-client.tsx — ATTENDY-EDU v5
// Theme-safe rewrite — all hardcoded slate/green/amber dark: Tailwind
// classes replaced with CSS variables.

import { useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Download, TrendingUp, Users, Clock, BarChart3,
  GraduationCap, Loader2, AlertCircle,
} from "lucide-react";
import { cn, formatTime, formatDate } from "@/lib/utils";

type LogEntry = {
  id: string;
  scanned_at: string;
  status: string;
  scan_type: string;
  late_reason: string | null;
  members: { full_name: string; class_name: string | null } | null;
};

type DayData = {
  date: string;
  label: string;
  present: number;
  late: number;
};

type TermStat = {
  member_id:          string;
  full_name:          string;
  class_name:         string | null;
  present_days:       number;
  late_days:          number;
  excused_days:       number;
  total_school_days:  number;
  attendance_pct:     number;
};

interface Props {
  orgId:     string;
  todayLogs: LogEntry[];
  chartData: DayData[];
  classes:   string[];
  slug:      string;
}

// ── Daily tab ────────────────────────────────────────────────
function DailyTab({
  todayLogs, chartData, classes,
}: {
  todayLogs: LogEntry[];
  chartData: DayData[];
  classes:   string[];
}) {
  const [classFilter, setClassFilter] = useState("all");

  const filtered = useMemo(() =>
    classFilter === "all"
      ? todayLogs
      : todayLogs.filter((l) => l.members?.class_name === classFilter),
    [todayLogs, classFilter]
  );

  const totalToday   = filtered.length;
  const presentToday = filtered.filter((l) => l.status === "present").length;
  const lateToday    = filtered.filter((l) => l.status === "late").length;
  const maxDay        = Math.max(...chartData.map((d) => d.present + d.late), 1);
  const weekTotal      = chartData.reduce((acc, d) => acc + d.present + d.late, 0);
  const weekAvg        = Math.round(weekTotal / 7);

  function downloadCSV() {
    const rows = [
      ["Time", "Student Name", "Class", "Status", "Late Reason"],
      ...filtered.map((l) => [
        formatTime(l.scanned_at),
        l.members?.full_name  ?? "",
        l.members?.class_name ?? "",
        l.status,
        l.late_reason ?? "",
      ]),
    ];
    const csv  = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `attendance_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Scanned Today", value: totalToday,   icon: Users,      color: "var(--status-info)",    bg: "var(--status-info-bg)" },
          { label: "On Time",       value: presentToday, icon: TrendingUp, color: "var(--status-success)", bg: "var(--status-success-bg)" },
          { label: "Late Today",    value: lateToday,    icon: Clock,      color: "var(--status-warning)", bg: "var(--status-warning-bg)" },
          { label: "7-day Avg",     value: weekAvg,      icon: BarChart3,  color: "var(--status-purple)",  bg: "var(--status-purple-bg)" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Last 7 Days</h3>
        <div className="flex items-end gap-2 h-36">
          {chartData.map((day) => {
            const total   = day.present + day.late;
            const pct     = Math.round((total / maxDay) * 100);
            const latePct = total > 0 ? Math.round((day.late / total) * 100) : 0;
            const isToday = day.date === new Date().toISOString().split("T")[0];
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>
                  {total || ""}
                </span>
                <div className="w-full relative" style={{ height: 100 }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-md overflow-hidden flex flex-col"
                    style={{ height: `${Math.max(pct, total > 0 ? 4 : 0)}%` }}
                  >
                    {day.late > 0 && (
                      <div className="w-full" style={{ height: `${latePct}%`, background: "var(--status-warning)" }} />
                    )}
                    <div className="w-full flex-1" style={{ background: isToday ? "var(--accent)" : "var(--accent-bg-strong)" }} />
                  </div>
                </div>
                <span className="text-[10px] font-mono" style={{ color: isToday ? "var(--accent)" : "var(--text-faint)", fontWeight: isToday ? 700 : 400 }}>
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs" style={{ color: "var(--text-faint)" }}>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: "var(--accent-bg-strong)" }} />On time</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: "var(--status-warning)" }} />Late</span>
        </div>
      </div>

      {/* Today log table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Today's Scans
            <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-faint)" }}>
              ({filtered.length})
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <select
              className="input-base w-auto text-xs py-1.5"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="all">All Classes</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={downloadCSV} className="btn-secondary text-xs py-1.5">
              <Download size={13} /> CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: "var(--bg-subtle)" }}>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th className="table-th">Student</th>
                <th className="table-th hidden sm:table-cell">Class</th>
                <th className="table-th">Time</th>
                <th className="table-th">Status</th>
                <th className="table-th hidden md:table-cell">Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="table-row">
                  <td className="table-td font-medium">{log.members?.full_name ?? "—"}</td>
                  <td className="table-td hidden sm:table-cell">
                    {log.members?.class_name
                      ? <span className="badge-green">{log.members.class_name}</span>
                      : "—"}
                  </td>
                  <td className="table-td font-mono text-xs">{formatTime(log.scanned_at)}</td>
                  <td className="table-td">
                    <span className={cn("badge",
                      log.status === "present" ? "badge-green" :
                      log.status === "late"    ? "badge-amber" :
                      log.status === "excused" ? "badge-blue"  : "badge-gray"
                    )}>
                      {log.status === "present" ? "On time" : log.status}
                    </span>
                  </td>
                  <td className="table-td hidden md:table-cell text-xs" style={{ color: "var(--text-faint)" }}>
                    {log.late_reason ?? "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-faint)" }}>
                    No scans today yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Term Report tab ──────────────────────────────────────────
function TermReportTab({ orgId, classes }: { orgId: string; classes: string[] }) {
  const supabase = createClient();

  const [termStart,    setTermStart]    = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [termEnd,      setTermEnd]      = useState(new Date().toISOString().split("T")[0]);
  const [classFilter,  setClassFilter]  = useState("all");
  const [stats,        setStats]        = useState<TermStat[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [fetched,      setFetched]      = useState(false);
  const [sortBy,       setSortBy]       = useState<"name" | "pct" | "present">("pct");
  const [sortDir,      setSortDir]      = useState<"asc" | "desc">("desc");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc("get_student_term_stats", {
        org_id:     orgId,
        term_start: termStart,
        term_end:   termEnd,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      setStats((data as TermStat[]) ?? []);
      setFetched(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [orgId, termStart, termEnd]);

  const filtered = useMemo(() => {
    let rows = classFilter === "all"
      ? stats
      : stats.filter((s) => s.class_name === classFilter);

    rows = [...rows].sort((a, b) => {
      let av = 0, bv = 0;
      if (sortBy === "name")    { av = a.full_name.localeCompare(b.full_name); return sortDir === "asc" ? av : -av; }
      if (sortBy === "pct")     { av = a.attendance_pct; bv = b.attendance_pct; }
      if (sortBy === "present") { av = a.present_days;   bv = b.present_days; }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [stats, classFilter, sortBy, sortDir]);

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  function downloadCSV() {
    const rows = [
      ["Name", "Class", "Present Days", "Late Days", "Excused Days", "School Days", "Attendance %"],
      ...filtered.map((s) => [
        s.full_name, s.class_name ?? "", s.present_days, s.late_days,
        s.excused_days, s.total_school_days, s.attendance_pct + "%",
      ]),
    ];
    const csv  = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `term_report_${termStart}_to_${termEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const belowThreshold = filtered.filter((s) => s.attendance_pct < 75).length;

  return (
    <div className="space-y-5">
      {/* Date pickers */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Term Date Range</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Term Start Date
            </label>
            <input type="date" className="input-base" value={termStart} onChange={(e) => setTermStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Term End Date
            </label>
            <input type="date" className="input-base" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} />
          </div>
        </div>
        <button onClick={fetchStats} disabled={loading} className="btn-primary text-sm">
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> Generating Report…</>
            : <><BarChart3 size={14} /> Generate Term Report</>}
        </button>
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: "var(--status-danger-bg)", color: "var(--status-danger)" }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {fetched && !loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Students", value: filtered.length, color: "var(--status-info)" },
              { label: "Avg Attendance", value: filtered.length > 0 ? Math.round(filtered.reduce((s,r) => s + r.attendance_pct, 0) / filtered.length) + "%" : "—", color: "var(--status-success)" },
              { label: "Below 75%",      value: belowThreshold,  color: belowThreshold > 0 ? "var(--status-danger)" : "var(--text-faint)" },
              { label: "School Days",    value: filtered[0]?.total_school_days ?? "—", color: "var(--text-secondary)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-4 text-center">
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select className="input-base w-auto text-sm" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="all">All Classes</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={downloadCSV} className="btn-secondary text-sm ml-auto">
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: "var(--bg-subtle)" }}>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    {[
                      { label: "Student",    col: "name"    as const },
                      { label: "Class",      col: null },
                      { label: "Present",    col: "present" as const },
                      { label: "Late",       col: null },
                      { label: "Excused",    col: null },
                      { label: "Attendance", col: "pct"     as const },
                    ].map(({ label, col }) => (
                      <th
                        key={label}
                        className={cn("table-th", col && "cursor-pointer")}
                        onClick={() => col && toggleSort(col)}
                      >
                        {label}
                        {col && sortBy === col && (sortDir === "asc" ? " ↑" : " ↓")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.member_id} className="table-row">
                      <td className="table-td font-medium">{s.full_name}</td>
                      <td className="table-td">
                        {s.class_name ? <span className="badge-green text-[10px]">{s.class_name}</span> : "—"}
                      </td>
                      <td className="table-td text-center font-mono">{s.present_days}</td>
                      <td className="table-td text-center font-mono" style={{ color: "var(--status-warning)" }}>{s.late_days}</td>
                      <td className="table-td text-center font-mono" style={{ color: "var(--status-info)" }}>{s.excused_days}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[80px]" style={{ background: "var(--border)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(s.attendance_pct, 100)}%`, background: s.attendance_pct >= 75 ? "var(--status-success)" : "var(--status-danger)" }}
                            />
                          </div>
                          <span className="text-xs font-bold font-mono min-w-[42px]" style={{ color: s.attendance_pct >= 75 ? "var(--status-success)" : "var(--status-danger)" }}>
                            {s.attendance_pct}%
                          </span>
                          {s.attendance_pct < 75 && (
                            <AlertCircle size={12} className="shrink-0" style={{ color: "var(--status-danger)" }} aria-label="Below 75% threshold" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-faint)" }}>
                        No students found for this date range and class filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export function ReportsClient({ orgId, todayLogs, chartData, classes }: Props) {
  const [activeTab, setActiveTab] = useState<"daily" | "term">("daily");

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="page-title">Reports</h2>
        <p className="page-sub">Attendance data and analytics</p>
      </div>

      <div className="flex gap-2">
        {(["daily", "term"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize"
            style={activeTab === tab ? { background: "var(--accent)", color: "white" } : { color: "var(--text-muted)" }}
          >
            {tab === "daily" ? "Today / 7-day" : "Term Report"}
          </button>
        ))}
      </div>

      {activeTab === "daily" && (
        <DailyTab todayLogs={todayLogs} chartData={chartData} classes={classes} />
      )}
      {activeTab === "term" && (
        <TermReportTab orgId={orgId} classes={classes} />
      )}
    </div>
  );
}
