"use client";
// src/app/portal/dashboard/page.tsx — ATTENDY-EDU v3
// Full parent dashboard: child profile, today status, 30-day stats, full scan log

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut, GraduationCap, CheckCircle, Clock, XCircle,
  CalendarDays, TrendingUp, ChevronRight, ChevronLeft,
  Phone, AlertCircle, Loader2, RefreshCw,
} from "lucide-react";

type Student = {
  id: string;
  full_name: string;
  class_name: string | null;
  organisation_id: string;
  parent_phone: string | null;
};

type Log = {
  id: string;
  scanned_at: string;
  status: string;
  scan_type: string;
  late_reason: string | null;
};

type OrgInfo = {
  name: string;
  primary_color: string;
  logo_url: string | null;
};

// Format helpers
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}
function fmtFull(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// Status config
const STATUS = {
  present: { label: "On time", color: "#4ade80", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", icon: CheckCircle },
  late:    { label: "Late",    color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.3)", icon: Clock },
  excused: { label: "Excused", color: "#60a5fa", bg: "rgba(96,165,250,0.1)",  border: "rgba(96,165,250,0.3)", icon: CheckCircle },
  absent:  { label: "Absent",  color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)", icon: XCircle },
} as const;

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

// ── Mini attendance heatmap (last 30 days) ──────────────────────
function AttendanceCalendar({ logs, primaryColor }: { logs: Log[]; primaryColor: string }) {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    return d;
  });

  const logMap: Record<string, string> = {};
  logs.forEach(l => {
    if (l.scan_type === "entry") {
      const key = l.scanned_at.split("T")[0];
      logMap[key] = l.status;
    }
  });

  return (
    <div>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8, fontFamily: "monospace", letterSpacing: "0.06em" }}>
        LAST 30 DAYS
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {days.map((d, i) => {
          const key = d.toISOString().split("T")[0];
          const status = logMap[key];
          const isToday = key === today.toISOString().split("T")[0];
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;

          let bg = isWeekend ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)";
          let border = "transparent";
          if (status === "present") { bg = "rgba(34,197,94,0.3)"; border = "rgba(34,197,94,0.5)"; }
          if (status === "late")    { bg = "rgba(251,191,36,0.25)"; border = "rgba(251,191,36,0.4)"; }
          if (status === "excused") { bg = "rgba(96,165,250,0.25)"; border = "rgba(96,165,250,0.4)"; }
          if (isToday) border = primaryColor;

          return (
            <div
              key={key}
              title={`${fmtDate(d.toISOString())}${status ? ` — ${STATUS[status as keyof typeof STATUS]?.label ?? status}` : isWeekend ? " (weekend)" : " — no record"}`}
              style={{
                width: 16, height: 16,
                borderRadius: 3,
                background: bg,
                border: `1px solid ${border}`,
                cursor: "default",
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        {[
          { color: "rgba(34,197,94,0.3)", label: "On time" },
          { color: "rgba(251,191,36,0.25)", label: "Late" },
          { color: "rgba(255,255,255,0.07)", label: "No record" },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(255,255,255,0.28)", fontFamily: "monospace" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────
export default function ParentDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [logs, setLogs] = useState<Log[]>([]);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Redirect if no session data
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

  // Fetch logs + org info when student changes
  const fetchData = useCallback(async (studentId: string, orgId: string, showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    const [{ data: logsData }, { data: orgData }] = await Promise.all([
      supabase
        .from("attendance_logs")
        .select("id, scanned_at, status, scan_type, late_reason")
        .eq("member_id", studentId)
        .eq("scan_type", "entry")
        .order("scanned_at", { ascending: false })
        .limit(90),
      supabase
        .from("organisations")
        .select("name, primary_color, logo_url")
        .eq("id", orgId)
        .single(),
    ]);

    setLogs(logsData ?? []);
    if (orgData) setOrgInfo(orgData as OrgInfo);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (selected) fetchData(selected.id, selected.organisation_id);
  }, [selected?.id]);

  function handleLogout() {
    sessionStorage.removeItem("parent_students");
    sessionStorage.removeItem("parent_phone");
    router.push("/portal");
  }

  const primary = orgInfo?.primary_color || "#16a34a";
  const today = new Date().toISOString().split("T")[0];
  const todayLog = logs.find(l => l.scanned_at.startsWith(today));

  const presentCount = logs.filter(l => l.status === "present").length;
  const lateCount    = logs.filter(l => l.status === "late").length;
  const excusedCount = logs.filter(l => l.status === "excused").length;
  const totalScanned = presentCount + lateCount + excusedCount;
  const attendancePct = totalScanned > 0 ? Math.round(((presentCount + lateCount) / totalScanned) * 100) : 0;

  function s(delay: number): React.CSSProperties {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(14px)",
      transition: `opacity 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    };
  }

  if (!selected && !loading) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030a05",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: "white",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

        .pd-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          backdrop-filter: blur(12px);
        }
        .pd-card-accent {
          background: rgba(255,255,255,0.025);
          border-radius: 18px;
        }
        .pd-log-row {
          display: flex; align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: background 0.15s ease;
          gap: 12px;
        }
        .pd-log-row:last-child { border-bottom: none; }
        .pd-log-row:hover { background: rgba(255,255,255,0.03); }
        @keyframes pdSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pdFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .pd-appear { animation: pdFadeIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
      `}</style>

      {/* Background gradient */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(ellipse 60% 40% at 50% -5%, ${primary}14 0%, transparent 55%)`,
      }} />

      {/* Topbar */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(3,10,5,0.9)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 1rem",
        height: 58,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GraduationCap size={14} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", lineHeight: 1 }}>
              {orgInfo?.name ?? "School Portal"}
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontFamily: "monospace", letterSpacing: "0.08em" }}>
              PARENT PORTAL
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => selected && fetchData(selected.id, selected.organisation_id, true)}
            title="Refresh"
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: "rgba(255,255,255,0.05)", border: "none",
              cursor: "pointer", color: "rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <RefreshCw size={13} style={refreshing ? { animation: "pdSpin 1s linear infinite" } : {}} />
          </button>
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 9,
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)",
              color: "#f87171", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>

        {/* Student switcher (if multiple children) */}
        {students.length > 1 && (
          <div style={{ ...s(0), display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {students.map((st, i) => (
              <button
                key={st.id}
                onClick={() => setSelectedIdx(i)}
                style={{
                  padding: "7px 16px", borderRadius: 100,
                  background: selectedIdx === i ? primary : "rgba(255,255,255,0.05)",
                  border: `1px solid ${selectedIdx === i ? primary : "rgba(255,255,255,0.1)"}`,
                  color: selectedIdx === i ? "white" : "rgba(255,255,255,0.5)",
                  fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s ease",
                }}
              >
                {st.full_name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320, gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              border: `2px solid rgba(34,197,94,0.15)`,
              borderTopColor: primary,
              animation: "pdSpin 0.9s linear infinite",
            }} />
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>Loading attendance…</p>
          </div>
        ) : selected ? (
          <>
            {/* Student profile card */}
            <div className="pd-card" style={{ ...s(60), padding: "1.5rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                {/* Avatar */}
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: `${primary}22`,
                  border: `2px solid ${primary}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 800, color: primary,
                  flexShrink: 0,
                }}>
                  {getInitials(selected.full_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 2 }}>
                    {selected.full_name}
                  </h2>
                  {selected.class_name && (
                    <p style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 12, fontWeight: 600, color: primary,
                      background: `${primary}15`,
                      border: `1px solid ${primary}30`,
                      borderRadius: 6, padding: "2px 8px",
                      marginBottom: 8,
                    }}>
                      <GraduationCap size={11} /> {selected.class_name}
                    </p>
                  )}
                  {/* Today's status */}
                  {todayLog ? (() => {
                    const cfg = STATUS[todayLog.status as keyof typeof STATUS] ?? STATUS.present;
                    const Icon = cfg.icon;
                    return (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", borderRadius: 10,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                      }}>
                        <Icon size={14} color={cfg.color} />
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label} today</span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 6, fontFamily: "monospace" }}>
                            scanned at {fmtTime(todayLog.scanned_at)}
                          </span>
                        </div>
                        {todayLog.late_reason && (
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
                            {todayLog.late_reason}
                          </span>
                        )}
                      </div>
                    );
                  })() : (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 12px", borderRadius: 10,
                      background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                    }}>
                      <AlertCircle size={14} color="#f87171" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#f87171" }}>Not scanned today</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>
                        — {fmtFull(new Date().toISOString())}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ ...s(120), display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: "1rem" }}>
              {[
                { label: "On time", value: presentCount, color: "#4ade80", bg: "rgba(34,197,94,0.08)" },
                { label: "Late",    value: lateCount,    color: "#fbbf24", bg: "rgba(251,191,36,0.08)" },
                { label: "Excused", value: excusedCount, color: "#60a5fa", bg: "rgba(96,165,250,0.08)" },
                { label: "Attend %", value: `${attendancePct}%`, color: attendancePct >= 75 ? "#4ade80" : "#f87171", bg: "rgba(255,255,255,0.03)" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="pd-card" style={{ padding: "12px 10px", textAlign: "center", background: bg }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", fontFamily: "monospace" }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Attendance bar */}
            <div className="pd-card" style={{ ...s(160), padding: "1.25rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>ATTENDANCE RATE</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: attendancePct >= 75 ? "#4ade80" : "#f87171", fontFamily: "monospace" }}>
                  {attendancePct}% {attendancePct >= 75 ? "✓ Good" : "⚠ Below 75%"}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 100, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(attendancePct, 100)}%`,
                  borderRadius: 100,
                  background: attendancePct >= 75
                    ? `linear-gradient(90deg, #16a34a, #4ade80)`
                    : `linear-gradient(90deg, #dc2626, #f87171)`,
                  transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
                }} />
              </div>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 6, fontFamily: "monospace" }}>
                Based on {totalScanned} recorded days
              </p>
            </div>

            {/* Heatmap calendar */}
            <div className="pd-card" style={{ ...s(200), padding: "1.25rem", marginBottom: "1rem" }}>
              <AttendanceCalendar logs={logs} primaryColor={primary} />
            </div>

            {/* Scan history */}
            <div className="pd-card" style={{ ...s(240), overflow: "hidden" }}>
              <div style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarDays size={15} color={primary} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>Scan History</span>
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                  {logs.length} records
                </span>
              </div>

              {logs.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center" }}>
                  <CalendarDays size={32} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No attendance records yet</p>
                </div>
              ) : (
                <div>
                  {logs.map((log) => {
                    const cfg = STATUS[log.status as keyof typeof STATUS];
                    if (!cfg) return null;
                    const Icon = cfg.icon;
                    return (
                      <div key={log.id} className="pd-log-row">
                        {/* Status dot */}
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Icon size={13} color={cfg.color} />
                        </div>
                        {/* Date & time */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                            {fmtDate(log.scanned_at)}
                          </p>
                          {log.late_reason && (
                            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                              {log.late_reason}
                            </p>
                          )}
                        </div>
                        {/* Time */}
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", flexShrink: 0 }}>
                          {fmtTime(log.scanned_at)}
                        </span>
                        {/* Badge */}
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: cfg.color,
                          background: cfg.bg, border: `1px solid ${cfg.border}`,
                          borderRadius: 6, padding: "2px 8px",
                          flexShrink: 0,
                        }}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Info footer */}
            <div style={{
              ...s(300),
              marginTop: "1.5rem",
              padding: "1rem 1.25rem",
              borderRadius: 14,
              background: "rgba(34,197,94,0.04)",
              border: "1px solid rgba(34,197,94,0.12)",
            }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                <span style={{ color: primary, fontWeight: 600 }}>How this works:</span> Your child's QR card is scanned at the school gate each morning. This page shows the full history. For queries, contact your school directly.
              </p>
              {selected.parent_phone && (
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontFamily: "monospace" }}>
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