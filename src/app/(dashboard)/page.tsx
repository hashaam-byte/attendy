import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users, UserCheck, UserX, Clock, TrendingUp,
  ScanLine, Bell, ArrowRight, AlertTriangle,
} from "lucide-react";
import { cn, formatTime, formatDate, getAttendancePct, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) redirect("/login");

  const orgId = orgUser.organisation_id;
  const today = new Date().toISOString().split("T")[0];

  const [
    { count: totalStudents },
    { count: presentToday },
    { count: lateToday },
    { data: recentScans },
    { data: absentList },
    { data: org },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("member_type", "student")
      .eq("is_active", true),

    supabase
      .from("attendance_logs")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .gte("scanned_at", `${today}T00:00:00`),

    supabase
      .from("attendance_logs")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .eq("status", "late")
      .gte("scanned_at", `${today}T00:00:00`),

    supabase
      .from("attendance_logs")
      .select("id, scanned_at, status, members(full_name, class_name)")
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .gte("scanned_at", `${today}T00:00:00`)
      .order("scanned_at", { ascending: false })
      .limit(8),

    // Members not yet scanned today
    supabase
      .from("members")
      .select("id, full_name, class_name")
      .eq("organisation_id", orgId)
      .eq("member_type", "student")
      .eq("is_active", true)
      .limit(6),

    supabase
      .from("organisations")
      .select("name, plan, plan_expires_at, max_members")
      .eq("id", orgId)
      .single(),
  ]);

  const absent = Math.max(0, (totalStudents ?? 0) - (presentToday ?? 0));
  const attendancePct = getAttendancePct(presentToday ?? 0, totalStudents ?? 1);

  // Check plan expiry
  const planExpiringSoon = org?.plan_expires_at
    ? new Date(org.plan_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-sub">
            {new Date().toLocaleDateString("en-NG", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>
        <Link href="/scanner" className="btn-primary self-start sm:self-auto">
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

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Students",
            value: formatNumber(totalStudents ?? 0),
            sub: `${org?.plan ?? "trial"} plan · ${org?.max_members ?? 30} max`,
            icon: Users,
            iconBg: "bg-blue-100 dark:bg-blue-900/30",
            iconColor: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Present Today",
            value: formatNumber(presentToday ?? 0),
            sub: `${attendancePct}% attendance rate`,
            icon: UserCheck,
            iconBg: "bg-green-100 dark:bg-green-900/30",
            iconColor: "text-green-600 dark:text-green-400",
          },
          {
            label: "Absent Today",
            value: formatNumber(absent),
            sub: "not yet scanned",
            icon: UserX,
            iconBg: "bg-red-100 dark:bg-red-900/30",
            iconColor: "text-red-600 dark:text-red-400",
          },
          {
            label: "Late Today",
            value: formatNumber(lateToday ?? 0),
            sub: "after cutoff time",
            icon: Clock,
            iconBg: "bg-amber-100 dark:bg-amber-900/30",
            iconColor: "text-amber-600 dark:text-amber-400",
          },
        ].map(({ label, value, sub, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="stat-card">
            <div className={cn("stat-icon", iconBg)}>
              <Icon size={18} className={iconColor} />
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
            <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Today's Attendance</h3>
          </div>
          <span className="text-sm font-bold text-green-600 dark:text-green-400">{attendancePct}%</span>
        </div>
        <div className="h-3 bg-green-100 dark:bg-green-950/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-700"
            style={{ width: `${attendancePct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400 dark:text-[#4a7a5a]">
          <span>{presentToday ?? 0} present</span>
          <span>{absent} absent</span>
          <span>{lateToday ?? 0} late</span>
        </div>
      </div>

      {/* Two column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent scans */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#bbf7d0] dark:border-[#1a3a24]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Scans</h3>
            <Link href="/reports" className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium">
              View all →
            </Link>
          </div>
          <div>
            {(recentScans ?? []).length === 0 ? (
              <div className="px-5 py-10 text-center">
                <ScanLine size={28} className="mx-auto text-green-200 dark:text-green-800 mb-2" />
                <p className="text-sm text-slate-400 dark:text-[#4a7a5a]">No scans yet today</p>
                <Link href="/scanner" className="text-xs text-green-600 dark:text-green-400 hover:underline mt-1 inline-block">
                  Open scanner →
                </Link>
              </div>
            ) : (
              (recentScans ?? []).map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] last:border-0 hover:bg-green-50/50 dark:hover:bg-green-950/10 transition-colors">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    log.status === "present" ? "bg-green-500" : log.status === "late" ? "bg-amber-500" : "bg-blue-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {log.members?.full_name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">
                      {log.members?.class_name ?? "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn(
                      "badge text-[10px]",
                      log.status === "present" ? "badge-green" : log.status === "late" ? "badge-amber" : "badge-blue"
                    )}>
                      {log.status === "present" ? "On time" : log.status === "late" ? "Late" : log.status}
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

        {/* Quick actions */}
        <div className="space-y-3">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { href: "/scanner", label: "Open Gate Scanner", sub: "Scan student QR cards", icon: ScanLine, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50" },
                { href: "/students/register", label: "Register New Student", sub: "Add a student and print QR card", icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "hover:bg-blue-50 dark:hover:bg-blue-950/20" },
                { href: "/reports", label: "Download Today's Report", sub: "Export attendance CSV or PDF", icon: TrendingUp, color: "text-amber-600 dark:text-amber-400", bg: "hover:bg-amber-50 dark:hover:bg-amber-950/20" },
                { href: "/notifications", label: "View SMS Log", sub: "See all parent notifications sent", icon: Bell, color: "text-purple-600 dark:text-purple-400", bg: "hover:bg-purple-50 dark:hover:bg-purple-950/20" },
              ].map(({ href, label, sub, icon: Icon, color, bg }) => (
                <Link key={href} href={href} className={cn("flex items-center gap-3 p-3 rounded-lg transition-all duration-150", bg)}>
                  <Icon size={16} className={cn(color, "shrink-0")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
                    <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">{sub}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 dark:text-[#2d5a3d] shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}