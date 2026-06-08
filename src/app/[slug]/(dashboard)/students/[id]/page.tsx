// src/app/[slug]/(dashboard)/students/[id]/page.tsx — ATTENDY-EDU v4
// CHANGES: Clean attendance summary (present/late/absent/%) with expandable
// full history section. No bulky heatmap on admin side.

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, QrCode, Phone, MessageSquare } from "lucide-react";
import { cn, formatDateTime, formatDate, getInitials } from "@/lib/utils";
import { StudentActions } from "./student-actions";
import { AttendanceSummary } from "./attendance-summary";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase      = await createClient();
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

  const { data: org } = await supabase
    .from("organisations")
    .select("name, settings")
    .eq("id", orgUser.organisation_id)
    .single();

  const settings = (org?.settings as any) || {};
  const termStart = settings.term_start_date
    ? new Date(settings.term_start_date)
    : new Date(new Date().setMonth(new Date().getMonth() - 3));
  const termEnd = settings.term_end_date
    ? new Date(settings.term_end_date)
    : new Date();

  // All entry scans since term start
  const { data: allLogs } = await supabase
    .from("attendance_logs")
    .select("id, scanned_at, status, scan_type, late_reason")
    .eq("member_id", id)
    .eq("scan_type", "entry")
    .gte("scanned_at", termStart.toISOString())
    .order("scanned_at", { ascending: false });

  // Exit scans
  const { data: exitLogs } = await supabase
    .from("attendance_logs")
    .select("id, scanned_at, status")
    .eq("member_id", id)
    .eq("scan_type", "exit")
    .order("scanned_at", { ascending: false })
    .limit(30);

  // Compute stats
  const presentCount = (allLogs ?? []).filter((l) => l.status === "present").length;
  const lateCount    = (allLogs ?? []).filter((l) => l.status === "late").length;
  const excusedCount = (allLogs ?? []).filter((l) => l.status === "excused").length;
  const totalDays    = Math.max(
    Math.ceil((termEnd.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24)),
    1
  );
  const attendedDays  = presentCount + lateCount + excusedCount;
  const attendancePct = Math.min(100, Math.round((attendedDays / totalDays) * 100));

  const canEdit   = ["admin", "teacher"].includes(orgUser.role);
  const canDelete = orgUser.role === "admin";

  const CLASSES = [
    "Nursery 1","Nursery 2","Nursery 3",
    "Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6",
    "JSS 1","JSS 2","JSS 3","SSS 1","SSS 2","SSS 3",
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
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Student suspended</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              QR card rejected at gate. Reactivate to restore access.
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

        {/* Right column */}
        <div className="sm:col-span-2 space-y-4">

          {/* ── Clean attendance summary ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attendance</h3>
              <span className="text-[10px] text-slate-400 dark:text-[#4a7a5a] font-mono">
                {formatDate(termStart.toISOString())} – {formatDate(termEnd.toISOString())}
              </span>
            </div>

            {/* Big % + bar */}
            <div className="flex items-end gap-3 mb-4">
              <span className={cn(
                "text-4xl font-bold font-mono",
                attendancePct >= 75
                  ? "text-green-600 dark:text-green-400"
                  : attendancePct >= 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-500"
              )}>
                {attendancePct}%
              </span>
              <span className="text-xs text-slate-400 dark:text-[#4a7a5a] mb-1">attendance rate</span>
            </div>

            <div className="h-2.5 bg-green-100 dark:bg-green-950/30 rounded-full overflow-hidden mb-4">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  attendancePct >= 75 ? "bg-green-500" :
                  attendancePct >= 50 ? "bg-amber-400" : "bg-red-500"
                )}
                style={{ width: `${attendancePct}%` }}
              />
            </div>

            {/* 4 stat chips */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Present",  value: presentCount,  color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-950/20" },
                { label: "Late",     value: lateCount,     color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/20" },
                { label: "Excused",  value: excusedCount,  color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/20" },
                { label: "Absent",   value: Math.max(0, totalDays - attendedDays), color: totalDays - attendedDays > 0 ? "text-red-500" : "text-slate-400", bg: "bg-red-50 dark:bg-red-950/10" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={cn("rounded-xl p-2.5 text-center", bg)}>
                  <p className={cn("text-lg font-bold", color)}>{value}</p>
                  <p className="text-[10px] text-slate-400 dark:text-[#4a7a5a] mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {attendancePct < 75 && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  ⚠ Below 75% — may affect exam eligibility
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
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

      {/* ── Expandable full attendance history ── */}
      <AttendanceSummary
        entryLogs={(allLogs ?? []).map((l) => ({
          id: l.id,
          scanned_at: l.scanned_at,
          status: l.status,
          late_reason: l.late_reason,
        }))}
        exitLogs={(exitLogs ?? []).map((l) => ({
          id: l.id,
          scanned_at: l.scanned_at,
        }))}
      />
    </div>
  );
}