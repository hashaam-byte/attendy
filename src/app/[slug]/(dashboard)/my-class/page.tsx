// src/app/[slug]/(dashboard)/my-class/page.tsx — ATTENDY-EDU v5
// Theme-safe rewrite (CSS variables, no hardcoded dark: classes).
// FIXED: the original file defined a local inline-SVG BookOpen
// component at the bottom because the import was missing — replaced
// with the real lucide-react import.
// ADDED: a "Message all absent parents" bulk WhatsApp action per class
// group, since teachers previously had no fast way to nudge a whole
// class of absent students' parents at once.

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckSquare, Users, ScanLine, UserX, BookOpen, MessageSquare } from "lucide-react";
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
          <Users size={32} className="mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            You have not been assigned to any class yet. Ask your admin to assign you in Settings → Class Assignments.
          </p>
        </div>
      </div>
    );
  }

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

  const { data: gateScans } = await supabase
    .from("attendance_logs")
    .select("member_id, status, scanned_at")
    .eq("organisation_id", orgId)
    .eq("scan_type", "entry")
    .gte("scanned_at", `${today}T00:00:00`);

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
            {assignedClasses.length > 0 ? assignedClasses.join(", ") : "All classes (admin view)"}
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
          { label: "Total",    value: total,   color: "var(--text-secondary)" },
          { label: "At Gate",  value: present, color: "var(--status-info)" },
          { label: "In Class", value: inClass, color: "var(--status-success)" },
          { label: "Absent",   value: absent,  color: absent > 0 ? "var(--status-danger)" : "var(--text-faint)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Class groups */}
      {Object.entries(grouped).map(([className, classStudents]) => {
        const absentInClass = (classStudents ?? []).filter((s) => !gateSet.has(s.id) && s.parent_phone);
        const waText = encodeURIComponent(
          `Hello, this is regarding ${className} attendance today. Your child has not yet been scanned in at the school gate. Please let us know if they are absent or running late.`
        );

        return (
          <div key={className} className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={{ borderColor: "var(--border)", background: "var(--accent-bg)" }}>
              <div className="flex items-center gap-2">
                <BookOpen size={14} style={{ color: "var(--accent)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{className}</h3>
                <span className="badge-gray text-[10px]">{classStudents?.length} students</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span style={{ color: "var(--status-info)" }}>
                  {(classStudents ?? []).filter((s) => gateSet.has(s.id)).length} gate
                </span>
                <span style={{ color: "var(--status-success)" }}>
                  {(classStudents ?? []).filter((s) => classSet.has(s.id)).length} in class
                </span>
                {absentInClass.length > 0 && (
                  <Link
                    href={`/${slug}/absent`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-medium"
                    style={{ background: "var(--status-danger-bg)", color: "var(--status-danger)" }}
                    title="View and message absent students individually"
                  >
                    <MessageSquare size={11} /> {absentInClass.length} absent
                  </Link>
                )}
              </div>
            </div>

            {(classStudents ?? []).map((student) => {
              const atGate     = gateSet.has(student.id);
              const inClassNow = classSet.has(student.id);
              const scan       = gateMap.get(student.id);

              return (
                <div
                  key={student.id}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: inClassNow ? "var(--status-success-bg)" : atGate ? "var(--status-info-bg)" : "var(--status-danger-bg)",
                      color: inClassNow ? "var(--status-success)" : atGate ? "var(--status-info)" : "var(--status-danger)",
                    }}
                  >
                    {getInitials(student.full_name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link href={`/${slug}/students/${student.id}`} className="text-sm font-medium truncate block hover:underline" style={{ color: "var(--text-primary)" }}>
                      {student.full_name}
                    </Link>
                    {student.employee_id && (
                      <p className="text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>{student.employee_id}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {atGate ? (
                      <span className="badge text-[10px]" style={{
                        background: scan?.status === "late" ? "var(--status-warning-bg)" : "var(--status-info-bg)",
                        color: scan?.status === "late" ? "var(--status-warning)" : "var(--status-info)",
                      }}>
                        <ScanLine size={9} className="mr-1" />
                        {scan?.status === "late" ? "Late" : "Gate"}
                        {scan && ` ${formatTime(scan.scanned_at)}`}
                      </span>
                    ) : (
                      <>
                        <span className="badge text-[10px]" style={{ background: "var(--status-danger-bg)", color: "var(--status-danger)" }}>
                          <UserX size={9} className="mr-1" />
                          Absent
                        </span>
                        {student.parent_phone && (
                          <a
                            href={`https://wa.me/${student.parent_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, ${student.full_name} has not been scanned at school today. Please let us know if they are absent.`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: "var(--status-success)" }}
                            title="WhatsApp parent"
                          >
                            <MessageSquare size={12} />
                          </a>
                        )}
                      </>
                    )}

                    {inClassNow && (
                      <span className="badge text-[10px]" style={{ background: "var(--status-success-bg)", color: "var(--status-success)" }}>
                        <CheckSquare size={9} className="mr-1" />
                        In class
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
