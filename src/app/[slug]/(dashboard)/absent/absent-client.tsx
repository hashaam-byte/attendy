"use client";
// src/app/(dashboard)/absent/absent-client.tsx — ATTENDY-EDU
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  UserX, Search, Phone, CheckCircle, MessageSquare,
  AlertTriangle, Loader2, Download, ArrowLeft,
} from "lucide-react";
import { cn, getInitials, formatNumber } from "@/lib/utils";
import Link from "next/link";

type Student = {
  id: string;
  full_name: string;
  class_name: string | null;
  parent_phone: string | null;
  employee_id: string | null;
};

const EXCUSE_REASONS = ["Sick", "Family emergency", "School trip", "Bereavement", "Sports event", "Parent excuse", "Other"];

export function AbsentClient({
  absentStudents, total, orgId, role, today,
}: {
  absentStudents: Student[]; total: number; orgId: string; role: string; today: string;
}) {
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [excusing, setExcusing] = useState<string | null>(null);
  const [excuseReason, setExcuseReason] = useState("Sick");
  const [excuseNote, setExcuseNote] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [excused, setExcused] = useState<Set<string>>(new Set());

  const classes = useMemo(() => {
    const s = new Set(absentStudents.map((s) => s.class_name).filter(Boolean) as string[]);
    return ["all", ...Array.from(s).sort()];
  }, [absentStudents]);

  const filtered = useMemo(() =>
    absentStudents.filter((s) => {
      const matchSearch = !search || s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.class_name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === "all" || s.class_name === classFilter;
      return matchSearch && matchClass;
    }),
    [absentStudents, search, classFilter]
  );

  const displayStudents = filtered.filter((s) => !excused.has(s.id));
  const presentCount = total - absentStudents.length + excused.size;
  const attendancePct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  async function handleExcuse(student: Student) {
    setLoading(student.id);
    const { error } = await supabase.from("attendance_logs").insert({
      organisation_id: orgId,
      member_id: student.id,
      scan_type: "entry",
      status: "excused",
      late_reason: `${excuseReason}${excuseNote ? `: ${excuseNote}` : ""}`,
      scanned_at: new Date().toISOString(),
    });
    if (!error) {
      setExcused((prev) => new Set([...prev, student.id]));
      setExcusing(null);
      setExcuseNote("");
    }
    setLoading(null);
  }

  function downloadCSV() {
    const rows = [
      ["Student Name", "Class", "Parent Phone", "Student ID"],
      ...displayStudents.map((s) => [s.full_name, s.class_name ?? "", s.parent_phone ?? "", s.employee_id ?? ""]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `absent-${today}.csv`;
    a.click();
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div className="flex-1">
          <h2 className="page-title">Absent Today</h2>
          <p className="page-sub">{displayStudents.length} absent · {presentCount} present · {attendancePct}% attendance</p>
        </div>
        <button onClick={downloadCSV} className="btn-secondary text-sm">
          <Download size={15} />Export CSV
        </button>
      </div>

      {/* Attendance bar */}
      <div className="card p-4">
        <div className="flex justify-between text-xs text-slate-500 dark:text-[#6b9e7a] mb-2">
          <span>{presentCount} present</span>
          <span className="font-semibold">{attendancePct}%</span>
          <span>{displayStudents.length} absent</span>
        </div>
        <div className="h-3 bg-red-100 dark:bg-red-950/30 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${attendancePct}%` }} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-base pl-9" placeholder="Search students…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-base w-auto" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          {classes.map((c) => <option key={c} value={c}>{c === "all" ? "All Classes" : c}</option>)}
        </select>
      </div>

      {displayStudents.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
          <p className="font-semibold text-slate-900 dark:text-white">All students accounted for!</p>
          <p className="text-sm text-slate-400 dark:text-[#4a7a5a] mt-1">Everyone has been scanned or marked excused today.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] bg-red-50 dark:bg-red-950/10 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            <span className="text-sm font-medium text-red-700 dark:text-red-400">
              {displayStudents.length} student{displayStudents.length !== 1 ? "s" : ""} not yet scanned today
            </span>
          </div>
          <div>
            {displayStudents.map((student) => (
              <div key={student.id}>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[#bbf7d0] dark:border-[#1a3a24] last:border-0 hover:bg-red-50/50 dark:hover:bg-red-950/10 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-sm font-bold text-red-700 dark:text-red-400 shrink-0">
                    {getInitials(student.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/students/${student.id}`} className="font-medium text-slate-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 truncate block">
                      {student.full_name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      {student.class_name && <span className="badge-gray text-[10px]">{student.class_name}</span>}
                      {student.parent_phone && (
                        <a href={`tel:${student.parent_phone}`} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                          <Phone size={10} />{student.parent_phone}
                        </a>
                      )}
                    </div>
                  </div>
                  {role === "admin" && (
                    <div className="flex items-center gap-2 shrink-0">
                      {student.parent_phone && (
                        <a
                          href={`https://wa.me/${student.parent_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, ${student.full_name} has not been scanned at school today. Please let us know if they are absent.`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors" title="WhatsApp parent">
                          <MessageSquare size={14} />
                        </a>
                      )}
                      <button onClick={() => setExcusing(excusing === student.id ? null : student.id)}
                        className="btn-secondary text-xs py-1.5">
                        <CheckCircle size={12} />Excuse
                      </button>
                    </div>
                  )}
                </div>

                {excusing === student.id && (
                  <div className="px-5 py-4 bg-amber-50 dark:bg-amber-950/10 border-b border-[#bbf7d0] dark:border-[#1a3a24]">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-3">
                      Mark {student.full_name} as excused today
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {EXCUSE_REASONS.map((r) => (
                        <button key={r} onClick={() => setExcuseReason(r)}
                          className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                            excuseReason === r
                              ? "bg-amber-100 dark:bg-amber-900/30 border-amber-400 text-amber-700 dark:text-amber-300"
                              : "border-[#bbf7d0] dark:border-[#1a3a24] text-slate-600 dark:text-green-300 hover:bg-amber-50")}>
                          {r}
                        </button>
                      ))}
                    </div>
                    <input className="input-base mb-3 text-xs" placeholder="Optional note…"
                      value={excuseNote} onChange={(e) => setExcuseNote(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => setExcusing(null)} className="btn-secondary text-xs py-1.5">Cancel</button>
                      <button onClick={() => handleExcuse(student)} disabled={loading === student.id}
                        className="btn-primary text-xs py-1.5 bg-amber-600 hover:bg-amber-700">
                        {loading === student.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Mark Excused
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}