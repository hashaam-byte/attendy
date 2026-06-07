// src/app/[slug]/(dashboard)/my-class/page.tsx — ATTENDY-EDU v4
// Teacher sees only students from their assigned classes.
// Links to class confirmation (in-class tick).

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckSquare, Users, ScanLine, UserX } from "lucide-react";
import { cn, getInitials, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MyClassPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug }  = await params;
  const supabase  = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/login`);

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("id, role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) redirect(`/${slug}/login`);
  if (!["admin", "teacher"].includes(orgUser.role)) redirect(`/${slug}/dashboard`);

  const orgId = orgUser.organisation_id;
  const today = new Date().toISOString().split("T")[0];

  // Get assigned classes
  const { data: assignments } = await supabase
    .from("class_assignments")
    .select("class_name, is_form_teacher")
    .eq("org_user_id", orgUser.id)
    .eq("organisation_id", orgId);

  const assignedClasses = (assignments ?? []).map((a) => a.class_name);

  if (assignedClasses.length === 0 && orgUser.role === "teacher") {
    return (
      <div className="max-w-md space-y-4">
        <h2 className="page-title">My Class</h2>
        <div className="card p-8 text-center">
          <Users size={32} className="mx-auto text-green-200 dark:text-green-800 mb-3" />
          <p className="text-sm text-slate-500 dark:text-[#6b9e7a]">
            You have not been assigned to any class yet. Ask your admin to assign you in Settings → Staff Management.
          </p>
        </div>
      </div>
    );
  }

  // Fetch students in assigned classes
  let q = supabase
    .from("members")
    .select("id, full_name, class_name, employee_id, parent_phone")
    .eq("organisation_id", orgId)
    .eq("member_type", "student")
    .eq("is_active", true)
    .order("class_name")
    .order("full_name");

  if (orgUser.role === "teacher" && assignedClasses.length > 0) {
    q = q.in("class_name", assignedClasses);
  }

  const { data: students } = await q;

  // Today's gate scans
  const { data: gateScans } = await supabase
    .from("attendance_logs")
    .select("member_id, status, scanned_at")
    .eq("organisation_id", orgId)
    .eq("scan_type", "entry")
    .gte("scanned_at", `${today}T00:00:00`);

  // Today's class ticks
  const { data: classScans } = await supabase
    .from("attendance_logs")
    .select("member_id, scanned_at")
    .eq("organisation_id", orgId)
    .eq("scan_type", "class")
    .gte("scanned_at", `${today}T00:00:00`);

  const gateSet  = new Set((gateScans  ?? []).map((s) => s.member_id));
  const classSet = new Set((classScans ?? []).map((s) => s.member_id));
  const gateMap  = new Map((gateScans  ?? []).map((s) => [s.member_id, s]));

  const total    = students?.length ?? 0;
  const present  = (students ?? []).filter((s) => gateSet.has(s.id)).length;
  const inClass  = (students ?? []).filter((s) => classSet.has(s.id)).length;
  const absent   = total - present;

  // Group by class
  const grouped: Record<string, typeof students> = {};
  (students ?? []).forEach((s) => {
    const cls = s.class_name ?? "Unassigned";
    if (!grouped[cls]) grouped[cls] = [];
    grouped[cls]!.push(s);
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="page-title">My Class</h2>
          <p className="page-sub">
            {assignedClasses.length > 0
              ? assignedClasses.join(", ")
              : "All classes (admin view)"}
          </p>
        </div>
        <Link href={`/${slug}/my-class/confirm`} className="btn-primary text-sm">
          <CheckSquare size={15} />
          Take Class Register
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total",    value: total,   color: "text-slate-700 dark:text-slate-300" },
          { label: "At Gate",  value: present, color: "text-blue-600 dark:text-blue-400" },
          { label: "In Class", value: inClass, color: "text-green-600 dark:text-green-400" },
          { label: "Absent",   value: absent,  color: absent > 0 ? "text-red-500" : "text-slate-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Class groups */}
      {Object.entries(grouped).map(([className, classStudents]) => (
        <div key={className} className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] bg-green-50/40 dark:bg-green-950/10">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{className}</h3>
              <span className="badge-gray text-[10px]">{classStudents?.length} students</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-blue-600 dark:text-blue-400">
                {(classStudents ?? []).filter((s) => gateSet.has(s.id)).length} gate
              </span>
              <span className="text-green-600 dark:text-green-400">
                {(classStudents ?? []).filter((s) => classSet.has(s.id)).length} in class
              </span>
            </div>
          </div>

          {(classStudents ?? []).map((student) => {
            const atGate    = gateSet.has(student.id);
            const inClassNow = classSet.has(student.id);
            const scan      = gateMap.get(student.id);

            return (
              <div
                key={student.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] last:border-0"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  inClassNow
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                    : atGate
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                )}>
                  {getInitials(student.full_name)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {student.full_name}
                  </p>
                  {student.employee_id && (
                    <p className="text-[10px] font-mono text-slate-400">{student.employee_id}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Gate status */}
                  {atGate ? (
                    <span className={cn(
                      "badge text-[10px]",
                      scan?.status === "late" ? "badge-amber" : "badge-blue"
                    )}>
                      <ScanLine size={9} className="mr-1" />
                      {scan?.status === "late" ? "Late" : "Gate"}
                      {scan && ` ${formatTime(scan.scanned_at)}`}
                    </span>
                  ) : (
                    <span className="badge badge-red text-[10px]">
                      <UserX size={9} className="mr-1" />
                      Absent
                    </span>
                  )}

                  {/* Class tick status */}
                  {inClassNow && (
                    <span className="badge badge-green text-[10px]">
                      <CheckSquare size={9} className="mr-1" />
                      In class
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Need to import this
function BookOpen({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}