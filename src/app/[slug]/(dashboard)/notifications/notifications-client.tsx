"use client";
// src/app/[slug]/(dashboard)/notifications/notifications-client.tsx — ATTENDY-EDU v4
// Interactive SMS log — full message on click, clear button, status badges.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle, XCircle, Trash2, MessageSquare, X } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

type Log = {
  id:        string;
  sent_at:   string;
  recipient: string;
  message:   string;
  status:    string;
  channel:   string;
  member_id: string | null;
  full_name: string | null;
};

interface Props {
  logs:         Log[];
  todayCount:   number;
  failedCount:  number;
  orgId:        string;
  slug:         string;
  appVersion:   { latest?: string; force?: boolean } | null;
  isAdmin:      boolean;
}

export function NotificationsClient({ logs: initial, todayCount, failedCount, orgId, slug, appVersion, isAdmin }: Props) {
  const router    = useRouter();
  const [logs, setLogs]           = useState<Log[]>(initial);
  const [selected, setSelected]   = useState<Log | null>(null);
  const [clearing, setClearing]   = useState(false);
  const [newVersion, setNewVersion] = useState(appVersion?.latest ?? "");
  const [forceUpdate, setForceUpdate] = useState(appVersion?.force ?? false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionSaved, setVersionSaved]   = useState(false);

  async function handleClear() {
    if (!confirm("Delete all SMS logs for your school? This cannot be undone.")) return;
    setClearing(true);
    try {
      // Use the API route (service role) — the anon Supabase client is blocked
      // by RLS on notifications_log DELETE which only allows platform admins.
      const res = await fetch(`/${slug}/api/clear-notifications`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert("Failed to clear: " + (body.error ?? res.statusText));
        return;
      }
      const { deleted } = await res.json();
      setLogs([]);
      router.refresh();
      // Brief confirmation so admin knows it worked
      console.log(`[notifications] cleared ${deleted} rows from DB`);
    } catch (err) {
      alert("Network error — could not clear logs.");
      console.error("[clear-notifications]", err);
    } finally {
      setClearing(false);
    }
  }

  async function handleSaveVersion() {
    if (!newVersion.trim()) return;
    setSavingVersion(true);
    setVersionSaved(false);
    try {
      const res = await fetch(`/${slug}/api/update-app-version`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ latest: newVersion.trim(), force: forceUpdate }),
      });
      if (res.ok) {
        setVersionSaved(true);
        setTimeout(() => setVersionSaved(false), 3000);
        router.refresh();
      } else {
        alert("Failed to save version.");
      }
    } finally {
      setSavingVersion(false);
    }
  }

  const statusColor = (status: string) =>
    status === "sent" || status === "delivered"
      ? "badge-green"
      : status === "failed"
      ? "badge-red"
      : "badge-gray";

  return (
    <div className="space-y-5 max-w-4xl">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="page-title">SMS Log</h2>
          <p className="page-sub">Every parent alert sent by your school via SMS or WhatsApp</p>
        </div>
        {logs.length > 0 && (
          <button onClick={handleClear} disabled={clearing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50">
            <Trash2 size={13} />
            {clearing ? "Clearing…" : "Clear All"}
          </button>
        )}
      </div>

      {/* App version update panel — admins only */}
      {isAdmin && (
        <div className="card p-4 border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/10">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={14} className="text-blue-500" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Mobile App Version</span>
            <span className="text-xs text-slate-400">— when you push a new app build, update this to notify users</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Current latest version</label>
              <input
                type="text"
                placeholder="e.g. 1.1.0"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                className="input-base text-sm"
                style={{ maxWidth: 140 }}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={forceUpdate}
                onChange={(e) => setForceUpdate(e.target.checked)}
                className="rounded"
              />
              Force update (old version stops working)
            </label>
            <button
              onClick={handleSaveVersion}
              disabled={savingVersion || !newVersion.trim()}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {savingVersion ? "Saving…" : versionSaved ? "✓ Saved" : "Push Update"}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {forceUpdate
              ? "⚠️ Force update: users will see a red banner saying the old version is unsupported."
              : "Soft update: users see a green banner on their Settings screen — they can dismiss it."}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={14} className="text-green-600 dark:text-green-400" />
            <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">Sent Today</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{todayCount}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={14} className={failedCount > 0 ? "text-red-500" : "text-slate-400"} />
            <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">Failed (24h)</p>
          </div>
          <p className={cn("text-2xl font-bold", failedCount > 0 ? "text-red-500" : "text-slate-900 dark:text-white")}>
            {failedCount}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
            <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">Total Logged</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{logs.length}</p>
        </div>
      </div>

      {/* Failed warning */}
      {failedCount > 0 && (
        <div className="card p-4 border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-950/10">
          <p className="text-sm text-red-700 dark:text-red-400">
            ⚠️ {failedCount} SMS failed in the last 24 hours. Check your Termii balance in Settings → Notifications.
          </p>
        </div>
      )}

      {/* Table */}
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
                <th className="table-th w-10"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="table-row cursor-pointer hover:bg-green-50/40 dark:hover:bg-green-950/10 transition-colors"
                  onClick={() => setSelected(log)}
                >
                  <td className="table-td text-xs whitespace-nowrap">{formatDateTime(log.sent_at)}</td>
                  <td className="table-td font-medium">{log.full_name ?? "—"}</td>
                  <td className="table-td hidden md:table-cell font-mono text-xs">{log.recipient}</td>
                  <td className="table-td hidden lg:table-cell text-xs max-w-[220px]">
                    <span className="truncate block text-slate-500 dark:text-[#6b9e7a]">{log.message}</span>
                  </td>
                  <td className="table-td">
                    <span className={cn("badge text-[10px]", statusColor(log.status))}>
                      {log.status}
                    </span>
                  </td>
                  <td className="table-td">
                    <MessageSquare size={13} className="text-slate-300 dark:text-[#2a4a34]" />
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400 dark:text-[#4a7a5a]">
                    No SMS sent yet. Notifications fire automatically when students scan in or are marked absent.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full message modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="card w-full max-w-lg p-0 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="font-semibold text-slate-900 dark:text-white">SMS Detail</h3>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Status banner */}
              {(() => {
                const ok = selected.status === "sent" || selected.status === "delivered";
                return (
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium",
                    ok
                      ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/40"
                      : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40"
                  )}>
                    {ok
                      ? <CheckCircle size={16} />
                      : <XCircle size={16} />
                    }
                    {ok ? "Delivered successfully" : `Failed to deliver — ${selected.status}`}
                  </div>
                );
              })()}

              {/* Fields */}
              {[
                { label: "Student",  value: selected.full_name ?? "Unknown" },
                { label: "Sent to",  value: selected.recipient },
                { label: "Channel",  value: selected.channel === "whatsapp" ? "WhatsApp" : "SMS (generic)" },
                { label: "Status",   value: selected.status },
                { label: "Time",     value: formatDateTime(selected.sent_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-[var(--border)] last:border-0">
                  <span className="text-sm font-medium text-slate-500 dark:text-[#6b9e7a] shrink-0 w-20">{label}</span>
                  <span className="text-sm text-slate-900 dark:text-white text-right">{value}</span>
                </div>
              ))}

              {/* Full message */}
              <div className="rounded-xl border border-[var(--border)] bg-slate-50 dark:bg-white/3 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-[#4a7a5a] mb-2">
                  Message sent
                </p>
                <p className="text-sm text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap select-all">
                  {selected.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}