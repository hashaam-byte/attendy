import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format, subDays } from "date-fns";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
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
  const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const [{ data: todayLogs }, { data: weeklyData }, { data: classes }] = await Promise.all([
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
  ]);

  // FIX: normalize members (Supabase returns array)
  const normalizedTodayLogs =
    (todayLogs ?? []).map((log) => ({
      ...log,
      members: Array.isArray(log.members)
        ? log.members[0] ?? null
        : log.members,
    }));

  // Build 7-day chart data
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
    ...new Set(
      (classes ?? [])
        .map((c) => c.class_name)
        .filter(Boolean) as string[]
    ),
  ].sort();

  return (
    <ReportsClient
      orgId={orgId}
      todayLogs={normalizedTodayLogs}
      chartData={chartData}
      classes={uniqueClasses}
    />
  );
}