// src/app/[slug]/(dashboard)/reports/page.tsx — ATTENDY-EDU v3
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format, subDays } from "date-fns";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
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
  const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const [{ data: todayLogs }, { data: weeklyData }, { data: allStudents }, { data: trendData }] = await Promise.all([
    supabase
      .from("attendance_logs")
      .select("id, scanned_at, status, scan_type, late_reason, members(full_name, class_name)")
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .gte("scanned_at", `${today}T00:00:00`)
      .order("scanned_at", { ascending: false }),

    supabase
      .from("attendance_logs")
      .select("scanned_at, status")
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .gte("scanned_at", `${sevenDaysAgo}T00:00:00`)
      .order("scanned_at"),

    supabase
      .from("members")
      .select("class_name")
      .eq("organisation_id", orgId)
      .eq("is_active", true)
      .eq("member_type", "student"),

    supabase
      .from("attendance_logs")
      .select("scanned_at, status, members(class_name)")
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .gte("scanned_at", `${thirtyDaysAgo}T00:00:00`)
      .order("scanned_at"),
  ]);

  // Normalize members field (Supabase may return array)
  const normalizedLogs = (todayLogs ?? []).map((log) => ({
    ...log,
    members: Array.isArray(log.members) ? log.members[0] ?? null : log.members,
  }));

  // Build 7-day chart
  const dayMap: Record<string, { present: number; late: number }> = {};
  (weeklyData ?? []).forEach((log) => {
    const d = log.scanned_at.split("T")[0];
    if (!dayMap[d]) dayMap[d] = { present: 0, late: 0 };
    if (log.status === "present") dayMap[d].present++;
    if (log.status === "late") dayMap[d].late++;
  });

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    return {
      date: d,
      label: format(subDays(new Date(), 6 - i), "EEE"),
      ...(dayMap[d] ?? { present: 0, late: 0 }),
    };
  });

  const uniqueClasses = [
    ...new Set((allStudents ?? []).map((c) => c.class_name).filter(Boolean) as string[]),
  ].sort();

  const totalActiveStudents = (allStudents ?? []).length;

  // 30-day trend: attendance % per day (present+late / total active students)
  const trendDayMap: Record<string, { present: number; late: number }> = {};
  const classDayMap: Record<string, Record<string, number>> = {}; // class -> date -> count
  (trendData ?? []).forEach((log: any) => {
    const d = log.scanned_at.split("T")[0];
    if (!trendDayMap[d]) trendDayMap[d] = { present: 0, late: 0 };
    if (log.status === "present") trendDayMap[d].present++;
    if (log.status === "late") trendDayMap[d].late++;

    const className = Array.isArray(log.members) ? log.members[0]?.class_name : log.members?.class_name;
    if (className) {
      if (!classDayMap[className]) classDayMap[className] = {};
      classDayMap[className][d] = (classDayMap[className][d] ?? 0) + 1;
    }
  });

  const trendSeries = Array.from({ length: 30 }, (_, i) => {
    const d = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
    const counts = trendDayMap[d] ?? { present: 0, late: 0 };
    const total = counts.present + counts.late;
    return {
      date: d,
      pct: totalActiveStudents > 0 ? Math.round((total / totalActiveStudents) * 100) : 0,
    };
  });

  // Per-class average daily attendance % over the last 30 days
  const classCounts: Record<string, number> = {};
  uniqueClasses.forEach((c) => { classCounts[c] = allStudents!.filter((s) => s.class_name === c).length; });

  const classAverages = uniqueClasses.map((className) => {
    const dayEntries = classDayMap[className] ?? {};
    const daysWithData = Object.keys(dayEntries).length || 1;
    const totalScans = Object.values(dayEntries).reduce((a, b) => a + b, 0);
    const classSize = classCounts[className] || 1;
    const avgPct = Math.round((totalScans / (classSize * daysWithData)) * 100);
    return { className, avgPct: Math.min(avgPct, 100) };
  }).sort((a, b) => b.avgPct - a.avgPct);

  return (
    <ReportsClient
      orgId={orgId}
      todayLogs={normalizedLogs}
      chartData={chartData}
      classes={uniqueClasses}
      slug={slug}
      trendSeries={trendSeries}
      classAverages={classAverages}
    />
  );
}