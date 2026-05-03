import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) redirect("/login");
  const orgId = orgUser.organisation_id;

  const today = new Date().toISOString().split("T")[0];

  // Get members grouped by class
  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, class_name, is_active")
    .eq("organisation_id", orgId)
    .eq("member_type", "student")
    .eq("is_active", true);

  // Today's attendance per member
  const { data: todayLogs } = await supabase
    .from("attendance_logs")
    .select("member_id, status")
    .eq("organisation_id", orgId)
    .eq("scan_type", "entry")
    .gte("scanned_at", `${today}T00:00:00`);

  const presentIds = new Set((todayLogs ?? []).map((l) => l.member_id));

  // Group by class
  const classMap: Record<string, { students: typeof members; present: number }> = {};
  for (const m of members ?? []) {
    const cls = m.class_name ?? "Unassigned";
    if (!classMap[cls]) classMap[cls] = { students: [], present: 0 };
    classMap[cls].students.push(m);
    if (presentIds.has(m.id)) classMap[cls].present++;
  }

  const classes = Object.entries(classMap).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="page-title">Classes</h2>
        <p className="page-sub">{classes.length} classes · attendance overview for today</p>
      </div>

      {classes.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={32} className="mx-auto text-green-200 dark:text-green-800 mb-3" />
          <p className="text-sm text-slate-400 dark:text-[#4a7a5a]">
            No classes yet. Add students and assign them to classes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(([className, data]) => {
            const pct = data.students.length > 0
              ? Math.round((data.present / data.students.length) * 100)
              : 0;

            return (
              <div key={className} className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">{className}</h3>
                  </div>
                  <span className="badge-gray">{formatNumber(data.students.length)} students</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-[#6b9e7a]">Present today</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {data.present} / {data.students.length}
                  </span>
                </div>

                <div className="h-2 bg-green-100 dark:bg-green-950/30 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      pct === 100 ? "bg-green-500" : pct >= 75 ? "bg-green-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <p className={cn(
                  "text-xs font-medium",
                  pct >= 75 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                )}>
                  {pct}% attendance rate
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}