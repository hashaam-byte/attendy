"use client";

import { useState, useMemo } from "react";
import { Download, TrendingUp, Users, Clock } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";

type LogEntry = {
  id: string;
  scanned_at: string;
  status: string;
  scan_type: string;
  late_reason: string | null;
  members: { full_name: string; class_name: string | null } | null;
};

type DayData = { date: string; label: string; present: number; late: number };

export function ReportsClient({
  orgId,
  todayLogs,
  chartData,
  classes,
}: {
  orgId: string;
  todayLogs: LogEntry[];
  chartData: DayData[];
  classes: string[];
}) {
  const [classFilter, setClassFilter] = useState("all");

  const filtered = useMemo(() =>
    classFilter === "all"
      ? todayLogs
      : todayLogs.filter((l) => l.members?.class_name === classFilter),
    [todayLogs, classFilter]
  );

  const totalToday = filtered.length;
  const lateToday = filtered.filter((l) => l.status === "late").length;
  const maxDay = Math.max(...chartData.map((d) => d.present + d.late), 1);

  function downloadCSV() {
    const rows = [
      ["Time", "Student Name", "Class", "Status", "Late Reason"],
      ...filtered.map((l) => [
        formatTime(l.scanned_at),
        l.members?.full_name ?? "",
        l.members?.class_name ?? "",
        l.status,
        l.late_reason ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Reports</h2>
          <p className="page-sub">Attendance data and analytics</p>
        </div>
        <button onClick={downloadCSV} className="btn-secondary self-start">
          <Download size={15} />
          Export Today CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Scanned Today", value: totalToday, icon: Users, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
          { label: "On Time", value: totalToday - lateToday, icon: TrendingUp, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
          { label: "Late Today", value: lateToday, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", bg)}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
              <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 7-day chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Last 7 Days</h3>
        <div className="flex items-end gap-2 h-32">
          {chartData.map((day) => {
            const total = day.present + day.late;
            const pct = Math.round((total / maxDay) * 100);
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-400 dark:text-[#4a7a5a] font-mono">{total}</span>
                <div className="w-full flex flex-col justify-end" style={{ height: 100 }}>
                  <div style={{ height: `${pct}%` }} className="w-full rounded-t-md overflow-hidden flex flex-col justify-end">
                    {day.late > 0 && (
                      <div
                        className="w-full bg-amber-400 dark:bg-amber-600"
                        style={{ height: `${Math.round((day.late / Math.max(total, 1)) * 100)}%` }}
                      />
                    )}
                    <div className="w-full bg-green-400 dark:bg-green-600 flex-1" />
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-[#4a7a5a] font-mono">{day.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-slate-400 dark:text-[#4a7a5a]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green-400" />On time</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-400" />Late</span>
        </div>
      </div>

      {/* Today's log */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#bbf7d0] dark:border-[#1a3a24]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Today's Scans</h3>
          <select
            className="input-base w-auto text-xs py-1.5"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="all">All Classes</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-50 dark:bg-green-950/20">
              <tr className="border-b border-[#bbf7d0] dark:border-[#1a3a24]">
                <th className="table-th">Student</th>
                <th className="table-th">Class</th>
                <th className="table-th">Time</th>
                <th className="table-th">Status</th>
                <th className="table-th hidden sm:table-cell">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="table-row">
                  <td className="table-td font-medium">{log.members?.full_name ?? "—"}</td>
                  <td className="table-td">
                    {log.members?.class_name ? <span className="badge-green">{log.members.class_name}</span> : "—"}
                  </td>
                  <td className="table-td font-mono text-xs">{formatTime(log.scanned_at)}</td>
                  <td className="table-td">
                    <span className={cn("badge", log.status === "present" ? "badge-green" : log.status === "late" ? "badge-amber" : "badge-gray")}>
                      {log.status === "present" ? "On time" : log.status}
                    </span>
                  </td>
                  <td className="table-td hidden sm:table-cell text-xs text-slate-400 dark:text-[#4a7a5a]">
                    {log.late_reason ?? "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400 dark:text-[#4a7a5a]">No scans today</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}