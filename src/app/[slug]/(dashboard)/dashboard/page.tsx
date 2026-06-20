// src/app/[slug]/(dashboard)/dashboard/page.tsx — ATTENDY-EDU v5
// Redesigned: cleaner stat cards, weekly sparkline, better quick-actions,
// fully theme-safe via CSS variables, no hardcoded colours.

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users, UserCheck, UserX, Clock,
  ScanLine, AlertTriangle, ArrowRight,
  BookOpen, BarChart3, QrCode, CheckSquare,
  Activity, Zap, Calendar, TrendingUp,
  Bell, Megaphone, FileCheck,
} from "lucide-react";
import { cn, formatTime, formatDate, formatNumber } from "@/lib/utils";
import { format, subDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/login`);

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) redirect(`/${slug}/login`);

  const orgId = orgUser.organisation_id;
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const [
    { count: totalStudents },
    { count: presentToday },
    { count: lateToday },
    { count: excusedToday },
    { data: recentScans },
    { data: org },
    { data: todayScannedIds },
    { data: allStudents },
    { count: pendingExcuses },
    { data: weeklyData },
    { count: totalNotices },
  ] = await Promise.all([
    supabase.from("members")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("member_type", "student")
      .eq("is_active", true),

    supabase.from("attendance_logs")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .in("status", ["present", "late", "excused"])
      .gte("scanned_at", `${today}T00:00:00`),

    supabase.from("attendance_logs")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .eq("status", "late")
      .gte("scanned_at", `${today}T00:00:00`),

    supabase.from("attendance_logs")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .eq("status", "excused")
      .gte("scanned_at", `${today}T00:00:00`),

    supabase.from("attendance_logs")
      .select("id, scanned_at, status, members(full_name, class_name)")
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .gte("scanned_at", `${today}T00:00:00`)
      .order("scanned_at", { ascending: false })
      .limit(8),

    supabase.from("organisations")
      .select("name, plan, plan_expires_at, max_members, settings, logo_url, primary_color")
      .eq("id", orgId)
      .single(),

    supabase.from("attendance_logs")
      .select("member_id")
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .gte("scanned_at", `${today}T00:00:00`),

    supabase.from("members")
      .select("id, full_name, class_name")
      .eq("organisation_id", orgId)
      .eq("member_type", "student")
      .eq("is_active", true)
      .order("class_name")
      .order("full_name"),

    supabase.from("excuse_requests")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("status", "pending"),

    supabase.from("attendance_logs")
      .select("scanned_at, status")
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .gte("scanned_at", `${sevenDaysAgo}T00:00:00`)
      .order("scanned_at"),

    supabase.from("school_notices")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
  ]);

  const scannedSet     = new Set((todayScannedIds ?? []).map((r) => r.member_id));
  const absentStudents = (allStudents ?? []).filter((s) => !scannedSet.has(s.id)).slice(0, 5);
  const absent         = Math.max(0, (totalStudents ?? 0) - (presentToday ?? 0));
  const attendancePct  = (totalStudents ?? 0) > 0
    ? Math.round(((presentToday ?? 0) / (totalStudents ?? 1)) * 100)
    : 0;

  const primaryColor = org?.primary_color || "#15a456";
  const settings     = (org?.settings as any) || {};
  const startTime    = settings.start_time || "07:30";
  const graceMins    = settings.grace_period_minutes ?? 15;
  const [sh, sm]     = startTime.split(":").map(Number);
  const totalM       = sh * 60 + sm + graceMins;
  const ch           = Math.floor(totalM / 60);
  const cm           = totalM % 60;
  const cutoffDisplay = `${ch}:${String(cm).padStart(2, "0")} ${ch >= 12 ? "PM" : "AM"}`;

  const todayFormatted = new Date().toLocaleDateString("en-NG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // ── 7-day sparkline data ──────────────────────────────
  const dayMap: Record<string, { present: number; late: number }> = {};
  (weeklyData ?? []).forEach((log) => {
    const d = log.scanned_at.split("T")[0];
    if (!dayMap[d]) dayMap[d] = { present: 0, late: 0 };
    if (log.status === "present") dayMap[d].present++;
    if (log.status === "late") dayMap[d].late++;
  });
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    return {
      date: d,
      label: format(subDays(new Date(), 6 - i), "EEE"),
      isToday: d === today,
      ...(dayMap[d] ?? { present: 0, late: 0 }),
    };
  });
  const maxBar = Math.max(...chartData.map((d) => d.present + d.late), 1);

  // ── Quick actions ─────────────────────────────────────
  const quickActions = [
    { href: `/${slug}/scanner`,           label: "Scanner",         sub: "Scan QR at gate",     icon: ScanLine,    color: primaryColor },
    { href: `/${slug}/students/register`, label: "Add Student",     sub: "Register new student", icon: Users,       color: "#2563eb" },
    { href: `/${slug}/qr-cards`,          label: "QR Cards",        sub: "Design & print",       icon: QrCode,      color: "#7c3aed" },
    { href: `/${slug}/reports`,           label: "Reports",         sub: "Analytics & export",   icon: BarChart3,   color: "#0891b2" },
    { href: `/${slug}/classes`,           label: "Classes",         sub: "Today by class",       icon: BookOpen,    color: "#059669" },
    { href: `/${slug}/notices`,           label: "Notices",         sub: `${totalNotices ?? 0} active`, icon: Megaphone, color: "#d97706" },
  ];

  return (
    <div className="space-y-5 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="page-title">
            {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"} 👋
          </h2>
          <p className="page-sub">{todayFormatted}</p>
        </div>
        <Link
          href={`/${slug}/scanner`}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
            boxShadow: `0 4px 14px ${primaryColor}40`,
          }}
        >
          <ScanLine size={16} />
          Open Scanner
        </Link>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Students", value: formatNumber(totalStudents ?? 0),
            sub: `${org?.max_members ?? 30} max`, icon: Users,
            iconColor: "#2563eb", iconBg: "rgba(37,99,235,0.1)",
            highlight: false,
          },
          {
            label: "Present Today", value: formatNumber(presentToday ?? 0),
            sub: `${attendancePct}% attendance`, icon: UserCheck,
            iconColor: primaryColor, iconBg: `${primaryColor}15`,
            highlight: true, highlightPct: attendancePct,
          },
          {
            label: "Absent", value: formatNumber(absent),
            sub: "not yet scanned", icon: UserX,
            iconColor: "#dc2626", iconBg: "rgba(220,38,38,0.1)",
            highlight: false,
          },
          {
            label: "Late Arrivals", value: formatNumber(lateToday ?? 0),
            sub: `after ${cutoffDisplay}`, icon: Clock,
            iconColor: "#d97706", iconBg: "rgba(217,119,6,0.1)",
            highlight: false,
          },
        ].map(({ label, value, sub, icon: Icon, iconColor, iconBg, highlight, highlightPct }) => (
          <div key={label} className="card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
                <Icon size={18} style={{ color: iconColor }} />
              </div>
              {highlight && highlightPct !== undefined && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: highlightPct >= 75 ? `${primaryColor}18` : "rgba(220,38,38,0.12)",
                    color: highlightPct >= 75 ? primaryColor : "#dc2626",
                  }}
                >
                  {highlightPct >= 75 ? "▲" : "▼"} {highlightPct}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-faint)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Attendance bar + 7-day chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Attendance bar */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
              <Activity size={15} style={{ color: primaryColor }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Today's Attendance</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{presentToday ?? 0} of {totalStudents ?? 0} scanned</p>
            </div>
            <div className="ml-auto text-2xl font-black" style={{ color: attendancePct >= 75 ? primaryColor : "#dc2626" }}>
              {attendancePct}%
            </div>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${attendancePct}%`,
                background: attendancePct >= 75
                  ? `linear-gradient(90deg, ${primaryColor}, ${primaryColor}cc)`
                  : "linear-gradient(90deg, #dc2626, #f87171)",
              }}
            />
          </div>
          <div className="flex justify-between mt-3 flex-wrap gap-2">
            {[
              { dot: "#22c55e", label: `${presentToday ?? 0} present` },
              { dot: "#f59e0b", label: `${lateToday ?? 0} late` },
              { dot: "#60a5fa", label: `${excusedToday ?? 0} excused` },
              { dot: "#f87171", label: `${absent} absent` },
            ].map(({ dot, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: dot }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* 7-day sparkline */}
        <div className="lg:col-span-3 card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--accent-bg)" }}>
              <TrendingUp size={15} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>7-day Attendance</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Entry scans per day this week</p>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-24">
            {chartData.map((day) => {
              const total = day.present + day.late;
              const pct = Math.round((total / maxBar) * 100);
              const latePct = total > 0 ? Math.round((day.late / total) * 100) : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono" style={{ color: "var(--text-faint)" }}>
                    {total > 0 ? total : ""}
                  </span>
                  <div className="w-full relative" style={{ height: 72 }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-sm overflow-hidden flex flex-col"
                      style={{ height: `${Math.max(pct, total > 0 ? 5 : 0)}%` }}
                    >
                      {day.late > 0 && (
                        <div className="w-full" style={{ height: `${latePct}%`, backgroundColor: "#f59e0b" }} />
                      )}
                      <div
                        className="w-full flex-1"
                        style={{ backgroundColor: day.isToday ? primaryColor : "var(--accent-bg-strong)" }}
                      />
                    </div>
                  </div>
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: day.isToday ? primaryColor : "var(--text-faint)" }}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-faint)" }}>
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: "var(--accent-bg-strong)" }} /> On time
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-faint)" }}>
              <span className="w-2 h-2 rounded-sm inline-block bg-amber-400" /> Late
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-faint)" }}>
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: primaryColor }} /> Today
            </span>
          </div>
        </div>
      </div>

      {/* ── Two-column: Recent scans + Right panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Recent scans */}
        <div className="lg:col-span-3 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <Zap size={15} style={{ color: primaryColor }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Recent Scans</h3>
            </div>
            <Link href={`/${slug}/reports`} className="text-xs font-medium hover:underline" style={{ color: primaryColor }}>
              View all →
            </Link>
          </div>

          {(recentScans ?? []).length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "var(--accent-bg)" }}>
                <ScanLine size={22} style={{ color: "var(--accent)" }} />
              </div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No scans yet today</p>
              <Link href={`/${slug}/scanner`} className="text-xs font-medium hover:underline mt-1 inline-block" style={{ color: primaryColor }}>
                Open scanner →
              </Link>
            </div>
          ) : (
            <div>
              {(recentScans ?? []).map((log: any) => {
                type StatusKey = "present" | "late" | "excused";
                const statusConfig: Record<StatusKey, { label: string; dotColor: string; badgeBg: string; badgeColor: string }> = {
                  present: { label: "On time", dotColor: "#22c55e", badgeBg: "var(--status-success-bg)", badgeColor: "var(--status-success)" },
                  late:    { label: "Late",    dotColor: "#f59e0b", badgeBg: "var(--status-warning-bg)", badgeColor: "var(--status-warning)" },
                  excused: { label: "Excused", dotColor: "#60a5fa", badgeBg: "var(--status-info-bg)",    badgeColor: "var(--status-info)" },
                };
                const cfg = statusConfig[log.status as StatusKey] ?? {
                  label: log.status, dotColor: "var(--border-strong)",
                  badgeBg: "var(--bg-subtle)", badgeColor: "var(--text-muted)",
                };
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 px-5 py-3 border-b last:border-0 transition-colors hover:bg-(--accent-bg)"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dotColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {log.members?.full_name ?? "Unknown"}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {log.members?.class_name ?? "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeColor }}>
                        {cfg.label}
                      </span>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{formatTime(log.scanned_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Absent preview */}
          {absentStudents.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)", backgroundColor: "var(--status-danger-bg)" }}>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} style={{ color: "var(--status-danger)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--status-danger)" }}>
                    {absent} Not Yet Scanned
                  </span>
                </div>
                <Link href={`/${slug}/absent`} className="text-[10px] font-medium hover:underline" style={{ color: "var(--status-danger)" }}>
                  View all →
                </Link>
              </div>
              {absentStudents.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 px-4 py-2.5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: "var(--status-danger-bg)", color: "var(--status-danger)" }}>
                    {s.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/${slug}/students/${s.id}`} className="text-xs font-medium truncate block hover:underline" style={{ color: "var(--text-primary)" }}>
                      {s.full_name}
                    </Link>
                    {s.class_name && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.class_name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending excuses alert */}
          {(pendingExcuses ?? 0) > 0 && (
            <Link
              href={`/${slug}/excuses`}
              className="card flex items-center gap-3 px-4 py-3.5 hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--status-warning-bg)" }}>
                <CheckSquare size={16} style={{ color: "var(--status-warning)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Excuse Requests</p>
                <p className="text-[11px]" style={{ color: "var(--status-warning)" }}>{pendingExcuses} awaiting review</p>
              </div>
              <ArrowRight size={14} style={{ color: "var(--icon-default)" }} />
            </Link>
          )}

          {/* Today's summary chip */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} style={{ color: "var(--accent)" }} />
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Today at a glance</p>
            </div>
            <div className="space-y-2">
              {[
                { label: "Start time", value: startTime, sub: `Grace: ${graceMins}m` },
                { label: "Late after", value: cutoffDisplay, sub: "" },
                { label: "Plan", value: org?.plan ?? "trial", sub: `${org?.max_members ?? 30} students max` },
              ].map(({ label, value, sub }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                  <div className="text-right">
                    <span className="text-xs font-semibold capitalize" style={{ color: "var(--text-primary)" }}>{value}</span>
                    {sub && <span className="text-[10px] ml-1.5" style={{ color: "var(--text-faint)" }}>{sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
            <Zap size={14} style={{ color: primaryColor }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Quick Actions</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map(({ href, label, sub, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 text-center hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${color}40`;
                (e.currentTarget as HTMLElement).style.backgroundColor = `${color}08`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-card)";
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: `${color}12` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-[11px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{label}</p>
                <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "var(--text-faint)" }}>{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
