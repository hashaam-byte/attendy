// src/app/[slug]/(dashboard)/classes/page.tsx — ATTENDY-EDU v5
// Theme-safe rewrite — replaced all hardcoded dark: Tailwind classes
// and raw green hex values with CSS variables.

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Users, TrendingUp } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClassesPage({
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
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();
  if (!orgUser) redirect(`/${slug}/login`);

  const orgId = orgUser.organisation_id;
  const today = new Date().toISOString().split("T")[0];

  const [{ data: members }, { data: todayLogs }] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, class_name")
      .eq("organisation_id", orgId)
      .eq("member_type", "student")
      .eq("is_active", true),

    supabase
      .from("attendance_logs")
      .select("member_id, status")
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .gte("scanned_at", `${today}T00:00:00`),
  ]);

  const presentIds = new Set((todayLogs ?? []).map((l) => l.member_id));
  const lateIds = new Set(
    (todayLogs ?? []).filter((l) => l.status === "late").map((l) => l.member_id)
  );

  type ClassData = {
    students: Array<{ id: string; full_name: string }>;
    present: number;
    late: number;
  };

  const classMap: Record<string, ClassData> = {};
  for (const m of members ?? []) {
    const cls = m.class_name ?? "Unassigned";
    if (!classMap[cls]) classMap[cls] = { students: [], present: 0, late: 0 };
    classMap[cls].students.push(m);
    if (presentIds.has(m.id)) classMap[cls].present++;
    if (lateIds.has(m.id)) classMap[cls].late++;
  }

  const classes = Object.entries(classMap).sort(([a], [b]) => a.localeCompare(b));
  const totalStudents = (members ?? []).length;
  const totalPresent = presentIds.size;
  const overallPct = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="page-title">Classes</h2>
        <p className="page-sub">
          {classes.length} classes · {totalPresent}/{totalStudents} present today · {overallPct}% overall
        </p>
      </div>

      {/* Overall bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} style={{ color: "var(--accent)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>School-wide attendance today</span>
          </div>
          <span className="text-sm font-bold" style={{ color: overallPct >= 75 ? "var(--accent)" : "var(--status-danger)" }}>
            {overallPct}%
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${overallPct}%`,
              background: overallPct >= 75 ? "var(--accent)" : "var(--status-warning)",
            }}
          />
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={32} className="mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No classes yet. Add students and assign them to classes.
          </p>
          <Link href={`/${slug}/students/register`} className="btn-primary mt-4 inline-flex">
            Add First Student
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(([className, data]) => {
            const pct = data.students.length > 0
              ? Math.round((data.present / data.students.length) * 100)
              : 0;
            const absent = data.students.length - data.present;

            return (
              <div key={className} className="card p-5 space-y-3 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} style={{ color: "var(--accent)" }} />
                    <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{className}</h3>
                  </div>
                  <span className="badge-gray">
                    <Users size={10} className="mr-1" />
                    {formatNumber(data.students.length)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="font-bold" style={{ color: "var(--status-success)" }}>{data.present}</p>
                    <p style={{ color: "var(--text-faint)" }}>Present</p>
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: "var(--status-warning)" }}>{data.late}</p>
                    <p style={{ color: "var(--text-faint)" }}>Late</p>
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: absent > 0 ? "var(--status-danger)" : "var(--text-faint)" }}>{absent}</p>
                    <p style={{ color: "var(--text-faint)" }}>Absent</p>
                  </div>
                </div>

                <div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? "var(--accent)" : pct >= 75 ? "var(--accent)" : pct >= 50 ? "var(--status-warning)" : "var(--status-danger)",
                      }}
                    />
                  </div>
                  <p className="text-xs font-medium mt-1.5" style={{
                    color: pct >= 75 ? "var(--accent)" : pct >= 50 ? "var(--status-warning)" : "var(--status-danger)"
                  }}>
                    {pct}% attendance rate
                  </p>
                </div>

                <Link
                  href={`/${slug}/absent`}
                  className="text-xs transition-colors inline-block"
                  style={{ color: "var(--text-faint)" }}
                >
                  View absent students →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
