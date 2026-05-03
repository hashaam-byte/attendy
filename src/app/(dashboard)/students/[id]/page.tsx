import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, QrCode, Phone, Calendar } from "lucide-react";
import { cn, formatDateTime, formatDate, getInitials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) redirect("/login");

  const { data: student } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .eq("organisation_id", orgUser.organisation_id)
    .eq("member_type", "student")
    .single();

  if (!student) notFound();

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [{ data: recentLogs }, { count: presentCount }, { count: lateCount }] = await Promise.all([
    supabase
      .from("attendance_logs")
      .select("id, scanned_at, status, scan_type, late_reason")
      .eq("member_id", id)
      .order("scanned_at", { ascending: false })
      .limit(20),

    supabase
      .from("attendance_logs")
      .select("*", { count: "exact", head: true })
      .eq("member_id", id)
      .eq("scan_type", "entry")
      .eq("status", "present")
      .gte("scanned_at", `${thirtyDaysAgo}T00:00:00`),

    supabase
      .from("attendance_logs")
      .select("*", { count: "exact", head: true })
      .eq("member_id", id)
      .eq("scan_type", "entry")
      .eq("status", "late")
      .gte("scanned_at", `${thirtyDaysAgo}T00:00:00`),
  ]);

  const totalLogDays = (presentCount ?? 0) + (lateCount ?? 0);
  const attendancePct = totalLogDays > 0 ? Math.round(((presentCount ?? 0) / totalLogDays) * 100) : 0;

  return (
    <div className="max-w-3xl space-y-5">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link href="/students" className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="page-title">{student.full_name}</h2>
          <p className="page-sub capitalize">{student.class_name ?? "No class"}</p>
        </div>
        <Link href={`/students/${id}/qr`} className="btn-primary">
          <QrCode size={15} />
          QR Card
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Profile card */}
        <div className="card p-5 sm:col-span-1 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-xl font-bold text-green-700 dark:text-green-400">
            {getInitials(student.full_name)}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{student.full_name}</p>
            {student.employee_id && (
              <p className="text-xs font-mono text-slate-400 dark:text-[#4a7a5a]">{student.employee_id}</p>
            )}
            <span className={cn("badge mt-1", student.is_active ? "badge-green" : "badge-red")}>
              {student.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          {student.class_name && (
            <span className="badge-blue">{student.class_name}</span>
          )}
          {student.parent_phone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-green-200">
              <Phone size={12} className="text-slate-400 dark:text-[#4a7a5a]" />
              <a href={`tel:${student.parent_phone}`} className="hover:text-green-600 dark:hover:text-green-400">
                {student.parent_phone}
              </a>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="sm:col-span-2 grid grid-cols-3 gap-3">
          {[
            { label: "Present (30d)", value: presentCount ?? 0, color: "text-green-600 dark:text-green-400" },
            { label: "Late (30d)", value: lateCount ?? 0, color: "text-amber-600 dark:text-amber-400" },
            { label: "Attendance %", value: `${attendancePct}%`, color: attendancePct >= 75 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4 text-center">
              <p className={cn("text-2xl font-bold", color)}>{value}</p>
              <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-1">{label}</p>
            </div>
          ))}

          <div className="col-span-3 card p-4">
            <div className="flex justify-between text-xs text-slate-500 dark:text-[#6b9e7a] mb-2">
              <span>Attendance rate (last 30 days)</span>
              <span className={attendancePct >= 75 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                {attendancePct >= 75 ? "✓ Good" : "⚠ Below 75%"}
              </span>
            </div>
            <div className="h-2.5 bg-green-100 dark:bg-green-950/30 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", attendancePct >= 75 ? "bg-green-500" : "bg-red-500")}
                style={{ width: `${Math.min(attendancePct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance history */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#bbf7d0] dark:border-[#1a3a24]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attendance History</h3>
          <span className="text-xs text-slate-400 dark:text-[#4a7a5a]">Last 20 entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-50 dark:bg-green-950/20">
              <tr className="border-b border-[#bbf7d0] dark:border-[#1a3a24]">
                <th className="table-th">Date & Time</th>
                <th className="table-th">Type</th>
                <th className="table-th">Status</th>
                <th className="table-th hidden sm:table-cell">Reason</th>
              </tr>
            </thead>
            <tbody>
              {(recentLogs ?? []).map((log) => (
                <tr key={log.id} className="table-row">
                  <td className="table-td">{formatDateTime(log.scanned_at)}</td>
                  <td className="table-td">
                    <span className="badge-gray capitalize">{log.scan_type}</span>
                  </td>
                  <td className="table-td">
                    <span className={cn(
                      "badge",
                      log.status === "present" ? "badge-green" :
                      log.status === "late" ? "badge-amber" :
                      log.status === "excused" ? "badge-blue" : "badge-red"
                    )}>
                      {log.status}
                    </span>
                  </td>
                  <td className="table-td hidden sm:table-cell text-slate-400 dark:text-[#4a7a5a] text-xs">
                    {log.late_reason ?? "—"}
                  </td>
                </tr>
              ))}
              {(recentLogs ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400 dark:text-[#4a7a5a]">
                    No attendance records yet.
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