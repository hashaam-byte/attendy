"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, LogOut } from "lucide-react";
import { cn, formatDateTime, formatTime } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Student = {
  id: string;
  full_name: string;
  class_name: string | null;
  organisation_id: string;
};

type Log = {
  id: string;
  scanned_at: string;
  status: string;
  scan_type: string;
};

export default function ParentDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("parent_students");
    if (!stored) { router.push("/portal"); return; }

    const parsed: Student[] = JSON.parse(stored);
    setStudents(parsed);
    setSelected(parsed[0]);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);

    supabase
      .from("attendance_logs")
      .select("id, scanned_at, status, scan_type")
      .eq("member_id", selected.id)
      .eq("scan_type", "entry")
      .order("scanned_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        setLogs(data ?? []);
        setLoading(false);
      });
  }, [selected]);

  const today = new Date().toISOString().split("T")[0];
  const todayLog = logs.find((l) => l.scanned_at.startsWith(today));
  const presentCount = logs.filter((l) => l.status === "present").length;
  const lateCount = logs.filter((l) => l.status === "late").length;
  const pct = logs.length > 0 ? Math.round((presentCount / logs.length) * 100) : 0;

  function handleLogout() {
    sessionStorage.removeItem("parent_students");
    sessionStorage.removeItem("parent_phone");
    router.push("/portal");
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] bg-white dark:bg-[#0c1a12]">
        <div className="flex items-center gap-2">
          <GraduationCap size={20} className="text-green-600 dark:text-green-400" />
          <span className="font-bold text-slate-900 dark:text-white text-sm">Attendy Parent Portal</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <button onClick={handleLogout} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Student selector */}
        {students.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                  selected?.id === s.id
                    ? "bg-green-600 text-white border-green-600"
                    : "border-[#bbf7d0] dark:border-[#1a3a24] text-slate-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"
                )}
              >
                {s.full_name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <>
            {/* Student card */}
            <div className="card p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-xl font-bold text-green-700 dark:text-green-400">
                  {selected.full_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selected.full_name}</h2>
                  <p className="text-sm text-slate-500 dark:text-[#6b9e7a]">{selected.class_name ?? "—"}</p>
                  {todayLog ? (
                    <span className={cn("badge mt-1", todayLog.status === "present" ? "badge-green" : "badge-amber")}>
                      ✓ {todayLog.status === "present" ? "On time" : "Late"} today at {formatTime(todayLog.scanned_at)}
                    </span>
                  ) : (
                    <span className="badge badge-red mt-1">Not scanned today</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Present", value: presentCount, color: "text-green-600 dark:text-green-400" },
                { label: "Late", value: lateCount, color: "text-amber-600 dark:text-amber-400" },
                { label: "Attendance", value: `${pct}%`, color: pct >= 75 ? "text-green-600 dark:text-green-400" : "text-red-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="card p-4 text-center">
                  <p className={cn("text-xl font-bold", color)}>{value}</p>
                  <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Log */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24]">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attendance History</h3>
              </div>
              {loading ? (
                <div className="p-8 text-center text-slate-400 dark:text-[#4a7a5a] text-sm">Loading…</div>
              ) : (
                <div>
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between px-4 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] last:border-0">
                      <p className="text-sm text-slate-700 dark:text-green-100">{formatDateTime(log.scanned_at)}</p>
                      <span className={cn("badge text-[10px]", log.status === "present" ? "badge-green" : log.status === "late" ? "badge-amber" : "badge-gray")}>
                        {log.status === "present" ? "On time" : log.status}
                      </span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-center py-8 text-sm text-slate-400 dark:text-[#4a7a5a]">No attendance records yet.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}