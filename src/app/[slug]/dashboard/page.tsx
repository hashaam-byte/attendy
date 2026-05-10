// src/app/[slug]/dashboard/page.tsx — ATTENDY-EDU v3
// Full dashboard: stats, scan feed, absent list, welfare alerts, quick actions
// Auth & org validation is handled entirely by [slug]/layout.tsx — no need to repeat it here.

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Users, UserCheck, UserX, Clock, TrendingUp,
  ScanLine, Bell, AlertTriangle, ArrowRight, Shield,
  BookOpen, BarChart3,
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

  // Layout already verified the user & org. We only need the org_id here.
  const { data: { user } } = await supabase.auth.getUser();
  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user!.id)
    .eq("is_active", true)
    .single();

  // orgUser will always exist at this point (layout already checked),
  // but TypeScript needs the guard.
  if (!orgUser) return null;

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
    { data: recentNotifs },
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

    supabase.from("notifications_log")
      .select("id, sent_at, status, members(full_name)")
      .eq("organisation_id", orgId)
      .order("sent_at", { ascending: false })
      .limit(3),
  ]);

  // Compute absent list
  const scannedSet = new Set((todayScannedIds ?? []).map((r) => r.member_id));
  const absentStudents = (allStudents ?? [])
    .filter((s) => !scannedSet.has(s.id))
    .slice(0, 5);

  const absent = Math.max(0, (totalStudents ?? 0) - (presentToday ?? 0));
  const attendancePct =
    (totalStudents ?? 0) > 0
      ? Math.round(((presentToday ?? 0) / (totalStudents ?? 1)) * 100)
      : 0;

  const primaryColor = org?.primary_color || "#16a34a";
  const settings = (org?.settings as any) || {};
  const startTime = settings.start_time || "07:30";
  const graceMins = settings.grace_period_minutes ?? 15;

  // Compute cutoff display
  const [sh, sm] = startTime.split(":").map(Number);
  const totalM = sh * 60 + sm + graceMins;
  const ch = Math.floor(totalM / 60);
  const cm = totalM % 60;
  const cutoffDisplay = `${ch}:${String(cm).padStart(2, "0")} ${ch >= 12 ? "PM" : "AM"}`;

  const planExpiringSoon = org?.plan_expires_at
    ? new Date(org.plan_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;

  const stats = [
    {
      label: "Total Students",
      value: formatNumber(totalStudents ?? 0),
      sub: `${org?.plan ?? "trial"} · ${org?.max_members ?? 30} max`,
      icon: Users,
      colorClass: "text-blue-600 dark:text-blue-400",
      bgClass: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Present Today",
      value: formatNumber(presentToday ?? 0),
      sub: `${attendancePct}% attendance`,
      icon: UserCheck,
      colorClass: "text-green-600 dark:text-green-400",
      bgClass: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Absent Today",
      value: formatNumber(absent),
      sub: "not yet scanned",
      icon: UserX,
      colorClass: "text-red-600 dark:text-red-400",
      bgClass: "bg-red-100 dark:bg-red-900/30",
    },
    {
      label: "Late Today",
      value: formatNumber(lateToday ?? 0),
      sub: `after ${cutoffDisplay}`,
      icon: Clock,
      colorClass: "text-amber-600 dark:text-amber-400",
      bgClass: "bg-amber-100 dark:bg-amber-900/30",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-sub">
            {new Date().toLocaleDateString("en-NG", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>
        <Link href={`/${slug}/scanner`} className="btn-primary self-start sm:self-auto" style={{ backgroundColor: primaryColor }}>
          <ScanLine size={16} />
          Open Scanner
        </Link>
      </div>

      {/* Plan warning */}
      {planExpiringSoon && (
        <div className="card p-4 border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/20 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Your school plan expires on{" "}
            <strong>{formatDate(org?.plan_expires_at ?? null)}</strong>. Contact Attendy to renew.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, colorClass, bgClass }) => (
          <div key={label} className="stat-card">
            <div className={cn("stat-icon", bgClass)}>
              <Icon size={18} className={colorClass} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-[#6b9e7a] uppercase tracking-wide mb-1">{label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
              <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Attendance bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} style={{ color: primaryColor }} />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Today's Attendance</h3>
          </div>
          <span className="text-sm font-bold" style={{ color: primaryColor }}>{attendancePct}%</span>
        </div>
        <div className="h-3 bg-green-100 dark:bg-green-950/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${attendancePct}%`, backgroundColor: primaryColor }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400 dark:text-[#4a7a5a]">
          <span>{presentToday ?? 0} present</span>
          <span>{excusedToday ?? 0} excused</span>
          <span>{lateToday ?? 0} late</span>
          <span>{absent} absent</span>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent scans */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#bbf7d0] dark:border-[#1a3a24]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Scans</h3>
            <Link href={`/${slug}/reports`} className="text-xs font-medium hover:underline" style={{ color: primaryColor }}>
              View all →
            </Link>
          </div>
          <div>
            {(recentScans ?? []).length === 0 ? (
              <div className="px-5 py-10 text-center">
                <ScanLine size={28} className="mx-auto text-green-200 dark:text-green-800 mb-2" />
                <p className="text-sm text-slate-400 dark:text-[#4a7a5a]">No scans yet today</p>
                <Link href={`/${slug}/scanner`} className="text-xs hover:underline mt-1 inline-block" style={{ color: primaryColor }}>
                  Open scanner →
                </Link>
              </div>
            ) : (
              (recentScans ?? []).map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 px-5 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] last:border-0 hover:bg-green-50/50 dark:hover:bg-green-950/10 transition-colors"
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      log.status === "present" ? "bg-green-500" :
                      log.status === "late" ? "bg-amber-500" :
                      log.status === "excused" ? "bg-blue-500" : "bg-slate-400"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {log.members?.full_name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">
                      {log.members?.class_name ?? "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "badge text-[10px]",
                        log.status === "present" ? "badge-green" :
                        log.status === "late" ? "badge-amber" :
                        log.status === "excused" ? "badge-blue" : "badge-gray"
                      )}
                    >
                      {log.status === "present" ? "On time" : log.status}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-[#4a7a5a] mt-0.5">
                      {formatTime(log.scanned_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Absent preview */}
          {absentStudents.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] bg-red-50 dark:bg-red-950/10">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {absent} Not Yet Scanned
                  </h3>
                </div>
                <Link href={`/${slug}/absent`} className="text-xs text-red-600 dark:text-red-400 hover:underline">
                  View all →
                </Link>
              </div>
              {absentStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-5 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-700 dark:text-red-400 shrink-0">
                    {s.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.full_name}</p>
                    {s.class_name && (
                      <span className="text-[10px] badge-gray">{s.class_name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { href: `/${slug}/scanner`, label: "Open Gate Scanner", sub: "Scan student QR cards", icon: ScanLine },
                { href: `/${slug}/students/register`, label: "Register New Student", sub: "Add student & print QR card", icon: Users },
                { href: `/${slug}/classes`, label: "Class Attendance", sub: "Today's breakdown by class", icon: BookOpen },
                { href: `/${slug}/reports`, label: "Download Reports", sub: "Export CSV or view charts", icon: BarChart3 },
                { href: `/${slug}/notifications`, label: "SMS Log", sub: "See all parent notifications", icon: Bell },
              ].map(({ href, label, sub, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/20 transition-all group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <Icon size={15} style={{ color: primaryColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
                    <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">{sub}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 dark:text-[#2d5a3d] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}