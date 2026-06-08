"use client";
// src/app/[slug]/(dashboard)/students/[id]/attendance-summary.tsx — ATTENDY-EDU v4
// Clean numbers + expandable "View full history" section. No heatmap.

import { useState } from "react";
import { ChevronDown, ChevronUp, ScanLine, ArrowRightFromLine } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

type EntryLog = {
  id:          string;
  scanned_at:  string;
  status:      string;
  late_reason: string | null;
};

type ExitLog = {
  id:         string;
  scanned_at: string;
};

interface Props {
  entryLogs: EntryLog[];
  exitLogs:  ExitLog[];
}

const STATUS_LABEL: Record<string, { label: string; badge: string }> = {
  present: { label: "On time",  badge: "badge-green" },
  late:    { label: "Late",     badge: "badge-amber" },
  excused: { label: "Excused",  badge: "badge-blue"  },
};

export function AttendanceSummary({ entryLogs, exitLogs }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Build a combined day map: date → { entry, exit }
  type DayRecord = { entry?: EntryLog; exit?: ExitLog };
  const dayMap: Record<string, DayRecord> = {};

  entryLogs.forEach((l) => {
    const d = l.scanned_at.split("T")[0];
    if (!dayMap[d]) dayMap[d] = {};
    dayMap[d]!.entry = l;
  });
  exitLogs.forEach((l) => {
    const d = l.scanned_at.split("T")[0];
    if (!dayMap[d]) dayMap[d] = {};
    dayMap[d]!.exit = l;
  });

  const sortedDays = Object.keys(dayMap).sort((a, b) => b.localeCompare(a));
  const visibleDays = expanded ? sortedDays : sortedDays.slice(0, 10);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#bbf7d0] dark:border-[#1a3a24]">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attendance History</h3>
        <span className="text-xs text-slate-400 dark:text-[#4a7a5a] font-mono">
          {entryLogs.length} entry · {exitLogs.length} exit records
        </span>
      </div>

      {entryLogs.length === 0 && exitLogs.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <ScanLine size={28} className="mx-auto text-green-200 dark:text-green-800 mb-2" />
          <p className="text-sm text-slate-400 dark:text-[#4a7a5a]">No attendance records yet.</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-[#bbf7d0] dark:divide-[#1a3a24]">
            {visibleDays.map((date) => {
              const day   = dayMap[date]!;
              const entry = day.entry;
              const exit  = day.exit;
              const statusCfg = entry
                ? (STATUS_LABEL[entry.status] ?? { label: entry.status, badge: "badge-gray" })
                : null;

              const displayDate = new Date(date).toLocaleDateString("en-NG", {
                weekday: "short",
                day:     "numeric",
                month:   "short",
              });

              return (
                <div key={date} className="flex items-center gap-3 px-5 py-3 hover:bg-green-50/30 dark:hover:bg-green-950/10 transition-colors">
                  {/* Date */}
                  <div className="w-24 shrink-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{displayDate}</p>
                  </div>

                  {/* Entry scan */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    {entry ? (
                      <>
                        <ScanLine size={11} className="text-green-500 shrink-0" />
                        <span className="text-xs text-slate-500 dark:text-[#6b9e7a] font-mono">
                          {new Date(entry.scanned_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className={cn("badge text-[10px]", statusCfg?.badge)}>
                          {statusCfg?.label}
                        </span>
                        {entry.late_reason && (
                          <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                            {entry.late_reason}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-[#2d5a3d]">No entry scan</span>
                    )}
                  </div>

                  {/* Exit scan */}
                  <div className="flex items-center gap-2 shrink-0">
                    {exit ? (
                      <>
                        <ArrowRightFromLine size={11} className="text-purple-400" />
                        <span className="text-xs text-slate-500 dark:text-[#6b9e7a] font-mono">
                          {new Date(exit.scanned_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="badge text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          Exit
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-200 dark:text-[#1a3a24]">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expand / collapse */}
          {sortedDays.length > 10 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 border-t border-[#bbf7d0] dark:border-[#1a3a24] transition-colors"
            >
              {expanded ? (
                <><ChevronUp size={14} /> Show less</>
              ) : (
                <><ChevronDown size={14} /> View full history ({sortedDays.length} days)</>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}