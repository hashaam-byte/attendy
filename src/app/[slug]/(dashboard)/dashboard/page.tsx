// src/app/[slug]/(dashboard)/dashboard/page.tsx — ATTENDY-EDU v4
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users, UserCheck, UserX, Clock, TrendingUp,
  ScanLine, Bell, AlertTriangle, ArrowRight,
  BookOpen, BarChart3, QrCode, CheckSquare,
  Activity, Zap, Calendar,
} from "lucide-react";
import { cn, formatTime, formatDate, formatNumber } from "@/lib/utils";

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
      .limit(6),

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
  ]);

  const scannedSet      = new Set((todayScannedIds ?? []).map((r) => r.member_id));
  const absentStudents  = (allStudents ?? []).filter((s) => !scannedSet.has(s.id)).slice(0, 4);
  const absent          = Math.max(0, (totalStudents ?? 0) - (presentToday ?? 0));
  const attendancePct   = (totalStudents ?? 0) > 0
    ? Math.round(((presentToday ?? 0) / (totalStudents ?? 1)) * 100)
    : 0;

  const primaryColor = org?.primary_color || "#1a9e50";
  const settings     = (org?.settings as any) || {};
  const startTime    = settings.start_time || "07:30";
  const graceMins    = settings.grace_period_minutes ?? 15;

  const [sh, sm]   = startTime.split(":").map(Number);
  const totalM     = sh * 60 + sm + graceMins;
  const ch         = Math.floor(totalM / 60);
  const cm         = totalM % 60;
  const cutoffDisplay = `${ch}:${String(cm).padStart(2, "0")} ${ch >= 12 ? "PM" : "AM"}`;

  const todayFormatted = new Date().toLocaleDateString("en-NG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const stats = [
    {
      label: "Total Students",
      value: formatNumber(totalStudents ?? 0),
      sub: `${org?.max_members ?? 30} max`,
      icon: Users,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.08)",
      trend: null,
    },
    {
      label: "Present Today",
      value: formatNumber(presentToday ?? 0),
      sub: `${attendancePct}% rate`,
      icon: UserCheck,
      color: "#1a9e50",
      bg: "rgba(26,158,80,0.08)",
      trend: attendancePct >= 75 ? "up" : "down",
    },
    {
      label: "Absent",
      value: formatNumber(absent),
      sub: "not scanned yet",
      icon: UserX,
      color: "#ef4444",
      bg: "rgba(239,68,68,0.08)",
      trend: null,
    },
    {
      label: "Late Arrivals",
      value: formatNumber(lateToday ?? 0),
      sub: `after ${cutoffDisplay}`,
      icon: Clock,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      trend: null,
    },
  ];

  const quickActions = [
    { href: `/${slug}/scanner`,          label: "Open Scanner",      sub: "Scan QR cards",          icon: ScanLine,    color: primaryColor },
    { href: `/${slug}/students/register`,label: "Add Student",       sub: "Register & print QR",    icon: Users,       color: "#3b82f6" },
    { href: `/${slug}/classes`,          label: "Class Overview",    sub: "Today by class",          icon: BookOpen,    color: "#8b5cf6" },
    { href: `/${slug}/qr-cards`,         label: "QR Cards",          sub: "Design & print",          icon: QrCode,      color: "#ec4899" },
    { href: `/${slug}/reports`,          label: "Reports",           sub: "Analytics & export",      icon: BarChart3,   color: "#06b6d4" },
    { href: `/${slug}/excuses`,          label: "Excuse Requests",   sub: `${pendingExcuses ?? 0} pending`, icon: CheckSquare, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="page-title">Good morning 👋</h2>
          <p className="page-sub">{todayFormatted}</p>
        </div>
        <Link
          href={`/${slug}/scanner`}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
            boxShadow: `0 4px 14px ${primaryColor}40`,
          }}
        >
          <ScanLine size={16} />
          Open Scanner
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, sub, icon: Icon, color, bg, trend }) => (
          <div key={label} className="card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: bg }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              {trend && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: trend === "up" ? "rgba(26,158,80,0.12)" : "rgba(239,68,68,0.12)",
                    color: trend === "up" ? "#1a9e50" : "#ef4444",
                  }}
                >
                  {trend === "up" ? "▲" : "▼"} {attendancePct}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-[#0d1f14] dark:text-[#e4f5ec]">{value}</p>
            <p className="text-xs font-medium text-[#5a7a66] dark:text-[#7aab8a] mt-0.5">{label}</p>
            <p className="text-[11px] text-[#9db8a7] dark:text-[#4a7a5a] mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Attendance bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
              <Activity size={15} style={{ color: primaryColor }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0d1f14] dark:text-[#e4f5ec]">Today's Attendance</p>
              <p className="text-[11px] text-[#7aab8a]">{presentToday ?? 0} of {totalStudents ?? 0} students scanned</p>
            </div>
          </div>
          <div
            className="text-2xl font-black"
            style={{ color: attendancePct >= 75 ? primaryColor : "#ef4444" }}
          >
            {attendancePct}%
          </div>
        </div>
        <div className="h-3 bg-[#edfaf2] dark:bg-[#0f2d1c] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${attendancePct}%`,
              background: attendancePct >= 75
                ? `linear-gradient(90deg, ${primaryColor}, ${primaryColor}cc)`
                : "linear-gradient(90deg, #ef4444, #f87171)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[11px] text-[#7aab8a]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {presentToday ?? 0} present
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            {lateToday ?? 0} late
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            {excusedToday ?? 0} excused
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {absent} absent
          </span>
        </div>
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Recent scans — wider */}
        <div className="lg:col-span-3 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#d1f0dc] dark:border-[#162e1f]">
            <div className="flex items-center gap-2">
              <Zap size={15} style={{ color: primaryColor }} />
              <h3 className="text-sm font-semibold text-[#0d1f14] dark:text-[#e4f5ec]">Recent Scans</h3>
            </div>
            <Link
              href={`/${slug}/reports`}
              className="text-xs font-medium hover:underline"
              style={{ color: primaryColor }}
            >
              View all →
            </Link>
          </div>

          {(recentScans ?? []).length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#edfaf2] dark:bg-[#0f2d1c] flex items-center justify-center mx-auto mb-3">
                <ScanLine size={22} className="text-[#1a9e50]" />
              </div>
              <p className="text-sm text-[#7aab8a]">No scans yet today</p>
              <Link
                href={`/${slug}/scanner`}
                className="text-xs font-medium hover:underline mt-1 inline-block"
                style={{ color: primaryColor }}
              >
                Open scanner →
              </Link>
            </div>
          ) : (
            <div>
              {(recentScans ?? []).map((log: any) => {
                const statusConfig = {
                  present: { label: "On time", dot: "bg-green-500", badge: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" },
                  late:    { label: "Late",    dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" },
                  excused: { label: "Excused", dot: "bg-blue-400",  badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
                }[log.status as string] ?? { label: log.status, dot: "bg-gray-400", badge: "bg-gray-50 text-gray-600" };

                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-[#d1f0dc] dark:border-[#162e1f] last:border-0 hover:bg-[#f7fdf9] dark:hover:bg-[rgba(15,45,28,0.2)] transition-colors"
                  >
                    <div className={cn("w-2 h-2 rounded-full shrink-0", statusConfig.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0d1f14] dark:text-[#e4f5ec] truncate">
                        {log.members?.full_name ?? "Unknown"}
                      </p>
                      <p className="text-[11px] text-[#7aab8a]">
                        {log.members?.class_name ?? "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusConfig.badge)}>
                        {statusConfig.label}
                      </span>
                      <p className="text-[10px] text-[#9db8a7] mt-0.5">{formatTime(log.scanned_at)}</p>
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
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#fee2e2] dark:border-red-900/30 bg-red-50/60 dark:bg-red-950/10">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-red-500" />
                  <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                    {absent} Not Yet Scanned
                  </span>
                </div>
                <Link href={`/${slug}/absent`} className="text-[10px] text-red-500 hover:underline font-medium">
                  View all →
                </Link>
              </div>
              {absentStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#d1f0dc] dark:border-[#162e1f] last:border-0"
                >
                  <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-[10px] font-bold text-red-600 shrink-0">
                    {s.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#0d1f14] dark:text-[#e4f5ec] truncate">{s.full_name}</p>
                    {s.class_name && (
                      <p className="text-[10px] text-[#7aab8a]">{s.class_name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending excuses alert */}
          {(pendingExcuses ?? 0) > 0 && (
            <Link
              href={`/${slug}/excuses`}
              className="card flex items-center gap-3 px-4 py-3.5 hover:shadow-md transition-all hover:-translate-y-0.5 block"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                <CheckSquare size={16} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0d1f14] dark:text-[#e4f5ec]">Excuse Requests</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400">{pendingExcuses} awaiting review</p>
              </div>
              <ArrowRight size={14} className="text-[#7aab8a]" />
            </Link>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
            <Zap size={14} style={{ color: primaryColor }} />
          </div>
          <h3 className="text-sm font-semibold text-[#0d1f14] dark:text-[#e4f5ec]">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(({ href, label, sub, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-[#d1f0dc] dark:border-[#162e1f] hover:border-transparent hover:shadow-md transition-all duration-200 text-center hover:-translate-y-0.5"
              style={{ ["--hover-bg" as any]: `${color}10` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
                style={{ backgroundColor: `${color}12` }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#0d1f14] dark:text-[#e4f5ec] leading-tight">{label}</p>
                <p className="text-[10px] text-[#9db8a7] mt-0.5 leading-tight">{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}