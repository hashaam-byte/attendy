// src/app/[slug]/(dashboard)/students/[id]/page.tsx — ATTENDY-EDU v3
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, QrCode, Phone, MessageSquare } from "lucide-react";
import { cn, formatDateTime, formatDate, getInitials } from "@/lib/utils";
import { StudentActions } from "./student-actions";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/login`);

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();
  if (!orgUser) redirect(`/${slug}/login`);

  const { data: student } = await supabase
    .from("members")
    .select("id, full_name, class_name, parent_phone, employee_id, is_active, notes, photo_url, created_at")
    .eq("id", id)
    .eq("organisation_id", orgUser.organisation_id)
    .eq("member_type", "student")
    .single();

  if (!student) notFound();

  // Fetch org name for ID generation reference
  const { data: org } = await supabase
    .from("organisations")
    .select("name")
    .eq("id", orgUser.organisation_id)
    .single();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  const [{ data: recentLogs }, { count: presentCount }, { count: lateCount }] =
    await Promise.all([
      supabase
        .from("attendance_logs")
        .select("id, scanned_at, status, scan_type, late_reason")
        .eq("member_id", id)
        .order("scanned_at", { ascending: false })
        .limit(30),
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

  const totalScanned = (presentCount ?? 0) + (lateCount ?? 0);
  const attendancePct =
    totalScanned > 0
      ? Math.round(((presentCount ?? 0) / totalScanned) * 100)
      : 0;
  const today = new Date().toISOString().split("T")[0];
  const todayLog = (recentLogs ?? []).find((l) => l.scanned_at.startsWith(today));

  const canEdit   = ["admin", "teacher"].includes(orgUser.role);
  const canDelete = orgUser.role === "admin";

  // Classes list for the edit form
  const CLASSES = [
    "Nursery 1","Nursery 2","Nursery 3",
    "Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6",
    "JSS 1","JSS 2","JSS 3",
    "SSS 1","SSS 2","SSS 3",
  ];

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/${slug}/students`} className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="page-title">{student.full_name}</h2>
          <p className="page-sub">{student.class_name ?? "No class"}</p>
        </div>
        <Link href={`/${slug}/qr-cards?id=${id}`} className="btn-primary">
          <QrCode size={15} />QR Card
        </Link>
      </div>

      {/* Suspended banner */}
      {!student.is_active && (
        <div className="card p-4 border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/20 flex items-center gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
              Student suspended
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              This student's QR card will be rejected at the gate with a suspension warning.
              Reactivate to restore access.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Profile card */}
        <div className="card p-5 sm:col-span-1 flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-2xl font-bold text-green-700 dark:text-green-400 overflow-hidden">
            {student.photo_url
              ? <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
              : getInitials(student.full_name)}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{student.full_name}</p>
            {student.employee_id && (
              <p className="text-xs font-mono text-slate-400 dark:text-[#4a7a5a] mt-0.5">
                {student.employee_id}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              <span className={cn("badge", student.is_active ? "badge-green" : "badge-amber")}>
                {student.is_active ? "Active" : "Suspended"}
              </span>
              {todayLog && (
                <span className={cn("badge", todayLog.status === "present" ? "badge-green" : "badge-amber")}>
                  {todayLog.status === "present" ? "✓ Today" : "Late today"}
                </span>
              )}
            </div>
          </div>
          {student.class_name && <span className="badge-blue">{student.class_name}</span>}
          {student.parent_phone && (
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-[#6b9e7a]">
                <Phone size={11} />
                <a href={`tel:${student.parent_phone}`} className="hover:text-green-600 font-mono">
                  {student.parent_phone}
                </a>
              </div>
              <a
                href={`https://wa.me/${student.parent_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, this is regarding ${student.full_name}.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-green-600 dark:text-green-400 hover:underline"
              >
                <MessageSquare size={11} />WhatsApp parent
              </a>
            </div>
          )}
          {student.notes && (
            <p className="text-xs text-slate-400 dark:text-[#4a7a5a] bg-slate-50 dark:bg-[#1a3a24]/50 rounded-lg p-2 w-full text-left">
              {student.notes}
            </p>
          )}
          <p className="text-[10px] text-slate-300 dark:text-[#2d5a3d]">
            Registered {formatDate(student.created_at)}
          </p>
        </div>

        {/* Stats + actions */}
        <div className="sm:col-span-2 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Present (30d)", value: presentCount ?? 0, color: "text-green-600 dark:text-green-400" },
              { label: "Late (30d)",    value: lateCount ?? 0,    color: "text-amber-600 dark:text-amber-400" },
              { label: "Attendance",   value: `${attendancePct}%`, color: attendancePct >= 75 ? "text-green-600 dark:text-green-400" : "text-red-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-4 text-center">
                <p className={cn("text-2xl font-bold", color)}>{value}</p>
                <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Attendance bar */}
          <div className="card p-4">
            <div className="flex justify-between text-xs text-slate-500 dark:text-[#6b9e7a] mb-2">
              <span>30-day attendance rate</span>
              <span className={attendancePct >= 75 ? "text-green-600 dark:text-green-400" : "text-red-500 font-semibold"}>
                {attendancePct >= 75 ? "✓ Good standing" : "⚠ Below 75%"}
              </span>
            </div>
            <div className="h-3 bg-green-100 dark:bg-green-950/30 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700",
                  attendancePct >= 75 ? "bg-green-500" : "bg-red-500")}
                style={{ width: `${Math.min(attendancePct, 100)}%` }}
              />
            </div>
          </div>

          {/* Actions — client component handles edit/suspend/delete */}
          {(canEdit || canDelete) && (
            <StudentActions
              student={{
                id:           student.id,
                full_name:    student.full_name,
                class_name:   student.class_name,
                parent_phone: student.parent_phone,
                employee_id:  student.employee_id,
                notes:        student.notes,
                is_active:    student.is_active,
              }}
              slug={slug}
              role={orgUser.role}
              classes={CLASSES}
            />
          )}
        </div>
      </div>

      {/* Attendance history table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#bbf7d0] dark:border-[#1a3a24]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attendance History</h3>
          <span className="text-xs text-slate-400 dark:text-[#4a7a5a]">Last 30 entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-50 dark:bg-green-950/20">
              <tr className="border-b border-[#bbf7d0] dark:border-[#1a3a24]">
                <th className="table-th">Date &amp; Time</th>
                <th className="table-th">Type</th>
                <th className="table-th">Status</th>
                <th className="table-th hidden sm:table-cell">Note</th>
              </tr>
            </thead>
            <tbody>
              {(recentLogs ?? []).map((log) => (
                <tr key={log.id} className="table-row">
                  <td className="table-td">{formatDateTime(log.scanned_at)}</td>
                  <td className="table-td"><span className="badge-gray capitalize">{log.scan_type}</span></td>
                  <td className="table-td">
                    <span className={cn("badge",
                      log.status === "present" ? "badge-green" :
                      log.status === "late"    ? "badge-amber" :
                      log.status === "excused" ? "badge-blue"  : "badge-red"
                    )}>
                      {log.status === "present" ? "On time" : log.status}
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
                    No records yet.
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