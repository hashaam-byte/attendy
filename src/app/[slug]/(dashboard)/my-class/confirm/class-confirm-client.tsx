"use client";
// src/app/[slug]/(dashboard)/my-class/confirm/class-confirm-client.tsx — ATTENDY-EDU v4
// Teacher ticks each student physically present in the classroom.
// Creates scan_type = 'class' record in attendance_logs.
// Can untick (corrects a wrong tick by deleting the class scan).

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CheckSquare, Square, Users, ScanLine, BookOpen,
  AlertTriangle, RefreshCw, Check, X as XIcon,
} from "lucide-react";
import { cn, formatTime, getInitials } from "@/lib/utils";

type Student = {
  id:          string;
  full_name:   string;
  class_name:  string | null;
  employee_id: string | null;
};

type ScanRecord = {
  member_id:  string;
  status?:    string;
  scanned_at: string;
};

type ClassScanRecord = {
  id:         string;
  member_id:  string;
  scanned_at: string;
};

interface Props {
  students: Student[];
  gateMap:  Record<string, ScanRecord>;
  classMap: Record<string, ClassScanRecord>;
  orgId:    string;
  slug:     string;
  role:     string;
  today:    string;
}

export function ClassConfirmClient({
  students, gateMap, classMap: initialClassMap, orgId, slug, role, today,
}: Props) {
  const supabase = createClient();

  const [classMap, setClassMap]     = useState<Record<string, ClassScanRecord>>(initialClassMap);
  const [ticking,  setTicking]      = useState<Set<string>>(new Set());
  const [classFilter, setClassFilter] = useState("all");

  // Group by class
  const classes = useMemo(() => {
    const s = new Set(students.map((s) => s.class_name).filter(Boolean) as string[]);
    return ["all", ...Array.from(s).sort()];
  }, [students]);

  const filtered = useMemo(() =>
    students.filter((s) =>
      classFilter === "all" || s.class_name === classFilter
    ), [students, classFilter]);

  // Stats
  const gateCount  = students.filter((s) => gateMap[s.id]).length;
  const classCount = students.filter((s) => classMap[s.id]).length;
  const total      = students.length;

  async function handleTick(student: Student) {
    if (ticking.has(student.id)) return;

    setTicking((prev) => new Set([...prev, student.id]));

    const existing = classMap[student.id];

    if (existing) {
      // Untick — delete the class scan record
      await supabase
        .from("attendance_logs")
        .delete()
        .eq("id", existing.id);

      setClassMap((prev) => {
        const next = { ...prev };
        delete next[student.id];
        return next;
      });
    } else {
      // Tick — insert class scan
      const { data, error } = await supabase
        .from("attendance_logs")
        .insert({
          organisation_id: orgId,
          member_id:        student.id,
          scan_type:        "class",
          status:           "present",
          scanned_at:       new Date().toISOString(),
        })
        .select("id, member_id, scanned_at")
        .single();

      if (!error && data) {
        setClassMap((prev) => ({
          ...prev,
          [student.id]: data as ClassScanRecord,
        }));
      }
    }

    setTicking((prev) => {
      const next = new Set(prev);
      next.delete(student.id);
      return next;
    });
  }

  // Bulk tick all gate-scanned students who aren't ticked yet
  async function tickAllGateScanned() {
    const unticked = filtered.filter(
      (s) => gateMap[s.id] && !classMap[s.id]
    );
    for (const s of unticked) {
      await handleTick(s);
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="page-title">Class Attendance</h2>
        <p className="page-sub">Confirm who is physically present in the classroom today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <ScanLine size={14} className="text-blue-500" />
            <span className="text-xs text-slate-500 dark:text-[#6b9e7a]">Gate scanned</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{gateCount}</p>
          <p className="text-[10px] text-slate-400">of {total} students</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckSquare size={14} className="text-green-600 dark:text-green-400" />
            <span className="text-xs text-slate-500 dark:text-[#6b9e7a]">In class</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{classCount}</p>
          <p className="text-[10px] text-slate-400">confirmed present</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-xs text-slate-500 dark:text-[#6b9e7a]">Not confirmed</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {total - classCount}
          </p>
          <p className="text-[10px] text-slate-400">not yet ticked</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 flex-1 min-w-0 flex-wrap">
          {classes.map((c) => (
            <button
              key={c}
              onClick={() => setClassFilter(c)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                classFilter === c
                  ? "bg-green-600 text-white"
                  : "text-slate-500 dark:text-[#6b9e7a] hover:bg-green-50 dark:hover:bg-green-950/20"
              )}
            >
              {c === "all" ? "All Classes" : c}
            </button>
          ))}
        </div>

        {/* Bulk tick gate-scanned */}
        <button
          onClick={tickAllGateScanned}
          className="btn-secondary text-xs py-1.5 gap-1.5 shrink-0"
        >
          <RefreshCw size={12} />
          Tick all gate-scanned
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-400 dark:text-[#4a7a5a]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700/50 inline-block" />
          Gate scanned today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30 border border-green-400 inline-block" />
          Confirmed in class
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-[#1a3a24] inline-block" />
          Not yet ticked
        </span>
      </div>

      {/* Student list */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={28} className="mx-auto text-green-200 dark:text-green-800 mb-2" />
            <p className="text-sm text-slate-400 dark:text-[#4a7a5a]">No students in this class.</p>
          </div>
        ) : (
          filtered.map((student) => {
            const gateScanned   = !!gateMap[student.id];
            const classConfirmed = !!classMap[student.id];
            const isTicking     = ticking.has(student.id);
            const gateScan      = gateMap[student.id];

            return (
              <div
                key={student.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] last:border-0 transition-colors",
                  classConfirmed
                    ? "bg-green-50/60 dark:bg-green-950/20"
                    : gateScanned
                    ? "bg-blue-50/40 dark:bg-blue-950/10"
                    : "hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  classConfirmed
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                    : gateScanned
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                )}>
                  {getInitials(student.full_name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {student.full_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {student.class_name && (
                      <span className="text-[10px] badge-gray">{student.class_name}</span>
                    )}
                    {gateScanned && gateScan && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
                        <ScanLine size={9} />
                        Gate {formatTime(gateScan.scanned_at)}
                        {gateScan.status === "late" && " (late)"}
                      </span>
                    )}
                    {classConfirmed && classMap[student.id] && (
                      <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                        <CheckSquare size={9} />
                        In class {formatTime(classMap[student.id].scanned_at)}
                      </span>
                    )}
                    {!gateScanned && !classConfirmed && (
                      <span className="text-[10px] text-slate-400 dark:text-[#4a7a5a]">
                        Not scanned at gate
                      </span>
                    )}
                  </div>
                </div>

                {/* Tick button */}
                <button
                  onClick={() => handleTick(student)}
                  disabled={isTicking}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all shrink-0",
                    classConfirmed
                      ? "bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400"
                      : "border-[#bbf7d0] dark:border-[#1a3a24] text-slate-500 hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-400 hover:text-green-700 dark:hover:text-green-400"
                  )}
                  title={classConfirmed ? "Untick (wrong)" : "Mark as in class"}
                >
                  {isTicking ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                  ) : classConfirmed ? (
                    <>
                      <Check size={13} />
                      Present
                    </>
                  ) : (
                    <>
                      <Square size={13} />
                      Tick
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">
        Ticks create a separate classroom attendance record. Tap a ticked student to untick (correct a mistake). One tick per student per day per class.
      </p>
    </div>
  );
}