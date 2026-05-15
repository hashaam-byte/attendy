// src/app/[slug]/(dashboard)/notifications/page.tsx — ATTENDY-EDU v3
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cn, formatDateTime } from "@/lib/utils";
import { Bell, CheckCircle, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
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
  const todayStart = new Date().toISOString().split("T")[0];

  const [{ data: logs }, { count: todayCount }, { count: failedCount }] = await Promise.all([
    supabase
      .from("notifications_log")
      .select("id, sent_at, recipient, message, status, channel, members(full_name)")
      .eq("organisation_id", orgId)
      .order("sent_at", { ascending: false })
      .limit(100),

    supabase
      .from("notifications_log")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .gte("sent_at", `${todayStart}T00:00:00`),

    supabase
      .from("notifications_log")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("status", "failed")
      .gte("sent_at", new Date(Date.now() - 86400000).toISOString()),
  ]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="page-title">SMS Notifications</h2>
        <p className="page-sub">Parent alerts sent by your school via SMS</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={14} className="text-green-600 dark:text-green-400" />
            <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">Sent Today</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{todayCount ?? 0}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={14} className={(failedCount ?? 0) > 0 ? "text-red-500" : "text-slate-400"} />
            <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">Failed (24h)</p>
          </div>
          <p className={cn("text-2xl font-bold", (failedCount ?? 0) > 0 ? "text-red-500" : "text-slate-900 dark:text-white")}>
            {failedCount ?? 0}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
            <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">Total Logged</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{logs?.length ?? 0}</p>
        </div>
      </div>

      {(failedCount ?? 0) > 0 && (
        <div className="card p-4 border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-950/10">
          <p className="text-sm text-red-700 dark:text-red-400">
            ⚠️ {failedCount} SMS failed in the last 24 hours. Check your Termii balance and sender ID in Settings.
          </p>
        </div>
      )}

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
                  <td className="table-td hidden lg:table-cell text-xs max-w-[200px] truncate text-slate-500 dark:text-[#6b9e7a]">
                    {log.message}
                  </td>
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
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400 dark:text-[#4a7a5a]">
                    No SMS sent yet. Notifications fire automatically when students scan in.
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