import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cn, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
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

  const [{ data: logs }, { count: todayCount }, { count: failedCount }] = await Promise.all([
    supabase
      .from("notifications_log")
      .select("id, sent_at, recipient, message, status, channel, member_id, members(full_name)")
      .eq("organisation_id", orgUser.organisation_id)
      .order("sent_at", { ascending: false })
      .limit(100),

    supabase
      .from("notifications_log")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgUser.organisation_id)
      .gte("sent_at", new Date().toISOString().split("T")[0]),

    supabase
      .from("notifications_log")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgUser.organisation_id)
      .eq("status", "failed")
      .gte("sent_at", new Date(Date.now() - 86400000).toISOString()),
  ]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="page-title">SMS Notifications</h2>
        <p className="page-sub">All parent alerts sent by your school</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mb-1">Sent Today</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{todayCount ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mb-1">Failed (24h)</p>
          <p className={cn("text-2xl font-bold", (failedCount ?? 0) > 0 ? "text-red-500" : "text-slate-900 dark:text-white")}>
            {failedCount ?? 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mb-1">Total Logged</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{logs?.length ?? 0}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-50 dark:bg-green-950/20">
              <tr className="border-b border-[#bbf7d0] dark:border-[#1a3a24]">
                <th className="table-th">Time</th>
                <th className="table-th">Student</th>
                <th className="table-th hidden md:table-cell">Recipient</th>
                <th className="table-th hidden lg:table-cell">Message</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((log: any) => (
                <tr key={log.id} className="table-row">
                  <td className="table-td text-xs whitespace-nowrap">{formatDateTime(log.sent_at)}</td>
                  <td className="table-td">{log.members?.full_name ?? "—"}</td>
                  <td className="table-td hidden md:table-cell font-mono text-xs">{log.recipient}</td>
                  <td className="table-td hidden lg:table-cell text-xs max-w-[200px] truncate text-slate-500 dark:text-[#6b9e7a]">{log.message}</td>
                  <td className="table-td">
                    <span className={cn("badge text-[10px]",
                      log.status === "delivered" || log.status === "sent" ? "badge-green" :
                      log.status === "failed" ? "badge-red" : "badge-gray"
                    )}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(logs ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400 dark:text-[#4a7a5a]">No SMS sent yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}