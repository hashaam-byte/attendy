"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut, GraduationCap, CheckCircle, Clock, XCircle,
  CalendarDays, ChevronRight, Phone,
  AlertCircle, Loader2, RefreshCw, Building2,
  Menu, X, FileCheck, Sun, Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────
type Student = {
  id:              string;
  full_name:       string;
  class_name:      string | null;
  organisation_id: string;
  parent_phone:    string | null;
};

type Log = {
  id:          string;
  scanned_at:  string;
  status:      string;
  scan_type:   string;
  late_reason: string | null;
};

type OrgInfo = {
  name:          string;
  primary_color: string;
  logo_url:      string | null;
  settings?:     any;
};

// Map of org_id → OrgInfo (supports multiple schools)
type OrgMap = Record<string, OrgInfo>;

// ── Helpers ────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    weekday: "short", day: "numeric", month: "short",
  });
}
function fmtFull(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const STATUS = {
  present: { label: "On time", color: "var(--status-success)", bg: "var(--status-success-bg)", icon: CheckCircle },
  late:    { label: "Late",    color: "var(--status-warning)", bg: "var(--status-warning-bg)", icon: Clock       },
  excused: { label: "Excused", color: "var(--status-info)",    bg: "var(--status-info-bg)",    icon: CheckCircle },
  absent:  { label: "Absent",  color: "var(--status-danger)",  bg: "var(--status-danger-bg)",  icon: XCircle     },
} as const;

// ── Attendance heatmap ─────────────────────────────────────────
function AttendanceCalendar({ logs }: { logs: Log[] }) {
  const today = new Date();
  const days  = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    return d;
  });

  const logMap: Record<string, string> = {};
  logs.forEach((l) => {
    if (l.scan_type === "entry") {
      logMap[l.scanned_at.split("T")[0]] = l.status;
    }
  });

  return (
    <div>
      <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.06em" }}>
        LAST 30 DAYS
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {days.map((d) => {
          const key       = d.toISOString().split("T")[0];
          const status    = logMap[key];
          const isToday   = key === today.toISOString().split("T")[0];
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;

          let bg = isWeekend ? "var(--bg-subtle)" : "var(--border)";
          let border = "transparent";
          if (status === "present") { bg = "var(--status-success-bg)"; border = "var(--status-success)"; }
          if (status === "late")    { bg = "var(--status-warning-bg)"; border = "var(--status-warning)"; }
          if (status === "excused") { bg = "var(--status-info-bg)";    border = "var(--status-info)";    }

          return (
            <div
              key={key}
              title={`${fmtDate(d.toISOString())}${status ? ` — ${STATUS[status as keyof typeof STATUS]?.label ?? status}` : isWeekend ? " (weekend)" : " — no record"}`}
              style={{
                width: 16, height: 16, borderRadius: 3, background: bg,
                border: `1.5px solid ${isToday ? "var(--accent)" : border}`,
                cursor: "default",
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        {[
          { color: "var(--status-success)", bg: "var(--status-success-bg)", label: "On time" },
          { color: "var(--status-warning)", bg: "var(--status-warning-bg)", label: "Late"    },
          { color: "var(--border)",         bg: "var(--border)",            label: "No record" },
        ].map(({ bg, color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: bg, border: `1px solid ${color}`, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────
export default function ParentDashboardPage() {
  const router   = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const [students,     setStudents]     = useState<Student[]>([]);
  const [selectedIdx,  setSelectedIdx]  = useState(0);
  const [logs,         setLogs]         = useState<Log[]>([]);
  const [orgMap,       setOrgMap]       = useState<OrgMap>({});
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [mounted,      setMounted]      = useState(false);
  const [navOpen,      setNavOpen]      = useState(false);

  // ── Load session data ────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("parent_students");
    if (!stored) { router.push("/portal"); return; }
    try {
      const parsed: Student[] = JSON.parse(stored);
      if (!parsed.length) { router.push("/portal"); return; }
      setStudents(parsed);
    } catch {
      router.push("/portal");
    }
    setTimeout(() => setMounted(true), 80);
  }, []);

  const selected = students[selectedIdx] ?? null;

  // ── Fetch logs + org info for selected student ───────────────
  const fetchData = useCallback(async (
    studentId: string,
    orgId:     string,
    showRefresh = false,
  ) => {
    if (showRefresh) setRefreshing(true);
    else             setLoading(true);

    // Fetch logs — 365 days back to support a full-term attendance %
    const { data: logsData } = await supabase
      .from("attendance_logs")
      .select("id, scanned_at, status, scan_type, late_reason")
      .eq("member_id",  studentId)
      .eq("scan_type",  "entry")
      .order("scanned_at", { ascending: false })
      .limit(400);

    setLogs(logsData ?? []);

    // Fetch org info — only if we don't already have it cached
    if (!orgMap[orgId]) {
      const { data: orgData } = await supabase
        .from("organisations")
        .select("id, name, primary_color, logo_url, settings")
        .eq("id", orgId)
        .single();

      if (orgData) {
        setOrgMap((prev) => ({
          ...prev,
          [orgId]: {
            name:          orgData.name,
            primary_color: orgData.primary_color ?? "#16a34a",
            logo_url:      orgData.logo_url ?? null,
            settings:      orgData.settings ?? {},
          },
        }));
      }
    }

    setLoading(false);
    setRefreshing(false);
  }, [orgMap]);

  useEffect(() => {
    if (selected) fetchData(selected.id, selected.organisation_id);
  }, [selected?.id]);

  function handleLogout() {
    sessionStorage.removeItem("parent_students");
    sessionStorage.removeItem("parent_phone");
    router.push("/portal");
  }

  // ── Derived values ───────────────────────────────────────────
  const orgInfo      = selected ? (orgMap[selected.organisation_id] ?? null) : null;
  const primary      = orgInfo?.primary_color ?? "#16a34a";
  const today        = new Date().toISOString().split("T")[0];
  const todayLog     = logs.find((l) => l.scanned_at.startsWith(today));

  const presentCount = logs.filter((l) => l.status === "present").length;
  const lateCount    = logs.filter((l) => l.status === "late").length;
  const excusedCount = logs.filter((l) => l.status === "excused").length;

  // ── FIXED: Attendance % now matches the admin student-profile formula —
  // it's based on total POSSIBLE school days in the term (not just days
  // scanned), so 2 on-time scans out of a 60-day term shows ~3%, not 100%.
  const settings   = orgInfo?.settings || {};
  const termStart  = settings.term_start_date
    ? new Date(settings.term_start_date)
    : new Date(new Date().setMonth(new Date().getMonth() - 3));
  const termEnd    = settings.term_end_date
    ? new Date(settings.term_end_date)
    : new Date();

  const logsInTerm = logs.filter((l) => {
    const d = new Date(l.scanned_at);
    return d >= termStart && d <= termEnd;
  });
  const presentInTerm = logsInTerm.filter((l) => l.status === "present").length;
  const lateInTerm    = logsInTerm.filter((l) => l.status === "late").length;
  const excusedInTerm = logsInTerm.filter((l) => l.status === "excused").length;
  const attendedDays  = presentInTerm + lateInTerm + excusedInTerm;

  const totalTermDays = Math.max(
    Math.ceil((termEnd.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24)),
    1
  );
  const attendancePct = Math.min(100, Math.round((attendedDays / totalTermDays) * 100));
  const absentDays    = Math.max(0, totalTermDays - attendedDays);

  // ── Stagger animation helper ─────────────────────────────────
  function s(delay: number): React.CSSProperties {
    return {
      opacity:    mounted ? 1 : 0,
      transform:  mounted ? "translateY(0)" : "translateY(14px)",
      transition: `opacity 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    };
  }

  if (!selected && !loading) return null;

  // ── Check if parent has children at multiple schools ─────────
  const uniqueOrgIds    = [...new Set(students.map((s) => s.organisation_id))];
  const multipleSchools = uniqueOrgIds.length > 1;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", fontFamily: "'DM Sans', system-ui, sans-serif", color: "var(--text-primary)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        .pd-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 18px; box-shadow: var(--shadow-sm); }
        .pd-log-row { display:flex; align-items:center; padding:12px 16px; border-bottom:1px solid var(--border); transition:background 0.15s; gap:12px; }
        .pd-log-row:last-child { border-bottom:none; }
        .pd-log-row:hover { background: var(--accent-bg); }
        .pd-nav-link { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; font-size:13px; font-weight:600; color: var(--text-secondary); transition: all 0.15s; text-decoration:none; }
        .pd-nav-link:hover { background: var(--accent-bg); color: var(--text-primary); }
        @keyframes pdSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* Background glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: `radial-gradient(ellipse 60% 40% at 50% -5%, ${primary}14 0%, transparent 55%)` }} />

      {/* Top bar */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--bg-sidebar)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)", padding: "0 1rem", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Nav drawer toggle */}
          <button
            onClick={() => setNavOpen(true)}
            style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent-bg)", border: "none", cursor: "pointer", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Menu size={15} />
          </button>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GraduationCap size={14} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
              {orgInfo?.name ?? "Parent Portal"}
            </p>
            <p style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600, letterSpacing: "0.08em" }}>
              ATTENDANCE VIEWER
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            style={{ width: 32, height: 32, borderRadius: 9, background: "var(--bg-subtle)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--icon-default)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button
            onClick={() => selected && fetchData(selected.id, selected.organisation_id, true)}
            style={{ width: 32, height: 32, borderRadius: 9, background: "var(--bg-subtle)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--icon-default)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <RefreshCw size={13} style={refreshing ? { animation: "pdSpin 1s linear infinite" } : {}} />
          </button>
          <button
            onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 9, background: "var(--status-danger-bg)", border: "none", color: "var(--status-danger)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </header>

      {/* ── Nav drawer ── */}
      {navOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setNavOpen(false)}
        >
          <div
            style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 260, background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)", padding: "1.25rem 1rem", display: "flex", flexDirection: "column", gap: 4 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>Parent Portal</span>
              <button onClick={() => setNavOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--icon-default)" }}>
                <X size={16} />
              </button>
            </div>
            <a className="pd-nav-link" href="/portal/dashboard" onClick={() => setNavOpen(false)}>
              <CalendarDays size={15} /> Dashboard
            </a>
            <a className="pd-nav-link" href="/portal/excuse" onClick={() => setNavOpen(false)}>
              <FileCheck size={15} /> Submit Excuse
            </a>
            <div style={{ flex: 1 }} />
            <button onClick={handleLogout} className="pd-nav-link" style={{ border: "none", background: "var(--status-danger-bg)", color: "var(--status-danger)", cursor: "pointer", width: "100%" }}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      )}

      <main style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>

        {/* ── Student switcher ── */}
        {students.length > 1 && (
          <div style={{ ...s(0), display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {students.map((st, i) => {
              const stOrg      = orgMap[st.organisation_id];
              const stColor    = stOrg?.primary_color ?? "#16a34a";
              const isSelected = selectedIdx === i;
              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedIdx(i)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 100,
                    background: isSelected ? stColor : "var(--bg-subtle)",
                    border:     `1px solid ${isSelected ? stColor : "var(--border)"}`,
                    color:      isSelected ? "white" : "var(--text-muted)",
                    fontSize:   13,
                    fontWeight: 600,
                    cursor:     "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s ease",
                    display:    "flex",
                    alignItems: "center",
                    gap:        6,
                  }}
                >
                  {st.full_name.split(" ")[0]}
                  {multipleSchools && stOrg && (
                    <span style={{ fontSize: 10, opacity: 0.7 }}>
                      · {stOrg.name.split(" ")[0]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320, gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid var(--accent-bg)`, borderTopColor: primary, animation: "pdSpin 0.9s linear infinite" }} />
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading attendance…</p>
          </div>
        ) : selected ? (
          <>
            {/* ── Profile card ── */}
            <div className="pd-card" style={{ ...s(60), padding: "1.5rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${primary}1a`, border: `2px solid ${primary}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: primary, flexShrink: 0 }}>
                  {getInitials(selected.full_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>
                    {selected.full_name}
                  </h2>

                  {orgInfo && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                      <Building2 size={11} style={{ color: primary }} />
                      <span style={{ fontSize: 12, color: primary, fontWeight: 600 }}>
                        {orgInfo.name}
                      </span>
                    </div>
                  )}

                  {selected.class_name && (
                    <p style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: primary, background: `${primary}15`, border: `1px solid ${primary}30`, borderRadius: 6, padding: "2px 8px", marginBottom: 8 }}>
                      <GraduationCap size={11} /> {selected.class_name}
                    </p>
                  )}

                  {/* Today status */}
                  {todayLog ? (() => {
                    const cfg  = STATUS[todayLog.status as keyof typeof STATUS] ?? STATUS.present;
                    const Icon = cfg.icon;
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}40` }}>
                        <Icon size={14} style={{ color: cfg.color }} />
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label} today</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                            scanned at {fmtTime(todayLog.scanned_at)}
                          </span>
                        </div>
                        {todayLog.late_reason && (
                          <span style={{ fontSize: 10, color: "var(--text-faint)", marginLeft: "auto" }}>
                            {todayLog.late_reason}
                          </span>
                        )}
                      </div>
                    );
                  })() : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "var(--status-danger-bg)", border: "1px solid var(--status-danger)40" }}>
                      <AlertCircle size={14} style={{ color: "var(--status-danger)" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--status-danger)" }}>Not scanned today</span>
                      <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: 4 }}>
                        — {fmtFull(new Date().toISOString())}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Stats row ── */}
            <div style={{ ...s(120), display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: "1rem" }}>
              {[
                { label: "On time",   value: presentCount,  color: "var(--status-success)", bg: "var(--status-success-bg)" },
                { label: "Late",      value: lateCount,     color: "var(--status-warning)", bg: "var(--status-warning-bg)" },
                { label: "Excused",   value: excusedCount,  color: "var(--status-info)",    bg: "var(--status-info-bg)" },
                { label: "Attend %",  value: `${attendancePct}%`, color: attendancePct >= 75 ? "var(--status-success)" : "var(--status-danger)", bg: "var(--bg-subtle)" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="pd-card" style={{ padding: "12px 10px", textAlign: "center", background: bg }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* ── Attendance bar ── */}
            <div className="pd-card" style={{ ...s(160), padding: "1.25rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>ATTENDANCE RATE (THIS TERM)</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: attendancePct >= 75 ? "var(--status-success)" : "var(--status-danger)" }}>
                  {attendancePct}% {attendancePct >= 75 ? "✓ Good" : "⚠ Below 75%"}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 100, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(attendancePct, 100)}%`, borderRadius: 100, background: attendancePct >= 75 ? `linear-gradient(90deg, ${primary}, ${primary}cc)` : `linear-gradient(90deg, #dc2626, #f87171)`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "var(--text-faint)" }}>
                <span>{attendedDays} attended / {totalTermDays} school days</span>
                <span>{absentDays} absent</span>
              </div>
            </div>

            {/* ── Heatmap ── */}
            <div className="pd-card" style={{ ...s(200), padding: "1.25rem", marginBottom: "1rem" }}>
              <AttendanceCalendar logs={logs} />
            </div>

            {/* ── Scan history ── */}
            <div className="pd-card" style={{ ...s(240), overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarDays size={15} style={{ color: primary }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Scan History</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{logs.length} records</span>
              </div>

              {logs.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center" }}>
                  <CalendarDays size={32} style={{ margin: "0 auto 12px", opacity: 0.2, color: "var(--icon-default)" }} />
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No attendance records yet</p>
                </div>
              ) : (
                logs.slice(0, 30).map((log) => {
                  const cfg = STATUS[log.status as keyof typeof STATUS];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  return (
                    <div key={log.id} className="pd-log-row">
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: cfg.bg, border: `1px solid ${cfg.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={13} style={{ color: cfg.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                          {fmtDate(log.scanned_at)}
                        </p>
                        {log.late_reason && (
                          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>
                            {log.late_reason}
                          </p>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", flexShrink: 0 }}>
                        {fmtTime(log.scanned_at)}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}40`, borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Quick action: Submit excuse ── */}
            <a
              href="/portal/excuse"
              className="pd-card"
              style={{ ...s(270), marginTop: "1rem", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 12, textDecoration: "none", transition: "all 0.15s" }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileCheck size={16} style={{ color: "var(--accent)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Submit an Excuse</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Request an excused absence for {selected.full_name.split(" ")[0]}</p>
              </div>
              <ChevronRight size={15} style={{ color: "var(--icon-default)" }} />
            </a>

            {/* Info footer */}
            <div style={{ ...s(300), marginTop: "1rem", padding: "1rem 1.25rem", borderRadius: 14, background: "var(--accent-bg)", border: "1px solid var(--border-strong)" }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>How this works:</span> Your child's QR card is scanned at the school gate each morning. For queries, contact {orgInfo?.name ?? "your school"} directly.
              </p>
              {selected.parent_phone && (
                <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <Phone size={10} /> SMS alerts sent to {selected.parent_phone}
                </p>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
