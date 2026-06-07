// src/app/[slug]/(dashboard)/my-class/confirm/page.tsx — ATTENDY-EDU v4
// Teachers open their class list, see who was gate-scanned vs not,
// and tick each student physically present in the classroom.
// Creates scan_type = 'class' record. Single tick per student per day.

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClassConfirmClient } from "./class-confirm-client";

export const dynamic = "force-dynamic";

export default async function ClassConfirmPage({
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

  // Get this teacher's assigned classes (admins see all classes)
  let assignedClasses: string[] = [];

  if (orgUser.role === "teacher") {
    const { data: assignments } = await supabase
      .from("class_assignments")
      .select("class_name")
      .eq("org_user_id", orgUser.id)
      .eq("organisation_id", orgId);

    assignedClasses = (assignments ?? []).map((a) => a.class_name);

    if (assignedClasses.length === 0) {
      // Teacher has no classes assigned yet
      return (
        <div className="max-w-md space-y-4">
          <h2 className="page-title">Class Attendance</h2>
          <div className="card p-8 text-center">
            <p className="text-sm text-slate-500 dark:text-[#6b9e7a]">
              You have not been assigned to any class yet. Ask your admin to assign you a class in Settings → Staff.
            </p>
          </div>
        </div>
      );
    }
  }

  // Fetch students (filtered by assigned classes for teachers)
  let studentsQuery = supabase
    .from("members")
    .select("id, full_name, class_name, employee_id")
    .eq("organisation_id", orgId)
    .eq("member_type", "student")
    .eq("is_active", true)
    .order("class_name")
    .order("full_name");

  if (orgUser.role === "teacher" && assignedClasses.length > 0) {
    studentsQuery = studentsQuery.in("class_name", assignedClasses);
  }

  const { data: students } = await studentsQuery;

  // Today's gate scans (entry)
  const { data: gateScans } = await supabase
    .from("attendance_logs")
    .select("member_id, status, scanned_at")
    .eq("organisation_id", orgId)
    .eq("scan_type", "entry")
    .gte("scanned_at", `${today}T00:00:00`);

  // Today's class confirmations (class tick)
  const { data: classScans } = await supabase
    .from("attendance_logs")
    .select("id, member_id, scanned_at")
    .eq("organisation_id", orgId)
    .eq("scan_type", "class")
    .gte("scanned_at", `${today}T00:00:00`);

  const gateMap  = new Map((gateScans  ?? []).map((s) => [s.member_id, s]));
  const classMap = new Map((classScans ?? []).map((s) => [s.member_id, s]));

  return (
    <ClassConfirmClient
      students={students ?? []}
      gateMap={Object.fromEntries(gateMap)}
      classMap={Object.fromEntries(classMap)}
      orgId={orgId}
      slug={slug}
      role={orgUser.role}
      today={today}
    />
  );
}