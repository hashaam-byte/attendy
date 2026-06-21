"use client";
// src/app/[slug]/(dashboard)/my-class/confirm/class-confirm-client.tsx — ATTENDY-EDU v5
// Theme-safe rewrite — all hardcoded slate/green/blue Tailwind dark:
// classes replaced with CSS variables.

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CheckSquare, Square, Users, ScanLine,
  AlertTriangle, RefreshCw, Check,
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
  students, gateMap, classMap: initialClassMap, orgId,
}: Props) {
  const supabase = createClient();

  const [classMap, setClassMap]       = useState<Record<string, ClassScanRecord>>(initialClassMap);
  const [ticking,  setTicking]        = useState<Set<string>>(new Set());
  const [classFilter, setClassFilter] = useState("all");

  const classes = useMemo(() => {
    const s = new Set(students.map((s) => s.class_name).filter(Boolean) as string[]);
    return ["all", ...Array.from(s).sort()];
  }, [students]);

  const filtered = useMemo(() =>
    students.filter((s) => classFilter === "all" || s.class_name === classFilter),
    [students, classFilter]
  );

  const gateCount  = students.filter((s) => gateMap[s.id]).length;
  const classCount = students.filter((s) => classMap[s.id]).length;
  const total      = students.length;

  async function handleTick(student: Student) {
    if (ticking.has(student.id)) return;
    setTicking((prev) => new Set([...prev, student.id]));

    const existing = classMap[student.id];

    if (existing) {
      await supabase.from("attendance_logs").delete().eq("id", existing.id);
      setClassMap((prev) => {
        const next = { ...prev };
        delete next[student.id];
        return next;
      });
    } else {
      const { data, error } = await supabase
        .from("attendance_logs")
        .insert({
          organisation_id: orgId,
          member_id:        student.id,
          scan_type:        "class",
          status:            "present",
          scanned_at:        new Date().toISOString(),
        })
        .select("id, member_id, scanned_at")
        .single();

      if (!error && data) {
        setClassMap((prev) => ({ ...prev, [student.id]: data as ClassScanRecord }));
      }
    }

    setTicking((prev) => {
      const next = new Set(prev);
      next.delete(student.id);
      return next;
    });
  }

  async function tickAllGateScanned() {
    const unticked = filtered.filter((s) => gateMap[s.id] && !classMap[s.id]);
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
            <ScanLine size={14} style={{ color: "var(--status-info)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Gate scanned</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--status-info)" }}>{gateCount}</p>
          <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>of {total} students</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckSquare size={14} style={{ color: "var(--status-success)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>In class</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--status-success)" }}>{classCount}</p>
          <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>confirmed present</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle size={14} style={{ color: "var(--status-warning)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Not confirmed</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--status-warning)" }}>{total - classCount}</p>
          <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>not yet ticked</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 flex-1 min-w-0 flex-wrap">
          {classes.map((c) => (
            <button
              key={c}
              onClick={() => setClassFilter(c)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={classFilter === c ? { background: "var(--accent)", color: "white" } : { color: "var(--text-muted)" }}
            >
              {c === "all" ? "All Classes" : c}
            </button>
          ))}
        </div>
        <button onClick={tickAllGateScanned} className="btn-secondary text-xs py-1.5 gap-1.5 shrink-0">
          <RefreshCw size={12} />
          Tick all gate-scanned
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs flex-wrap" style={{ color: "var(--text-faint)" }}>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded inline-block border" style={{ background: "var(--status-info-bg)", borderColor: "var(--status-info)" }} />
          Gate scanned today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded inline-block border" style={{ background: "var(--status-success-bg)", borderColor: "var(--status-success)" }} />
          Confirmed in class
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded inline-block border" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }} />
          Not yet ticked
        </span>
      </div>

      {/* Student list */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={28} className="mx-auto mb-2" style={{ color: "var(--text-faint)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No students in this class.</p>
          </div>
        ) : (
          filtered.map((student) => {
            const gateScanned    = !!gateMap[student.id];
            const classConfirmed = !!classMap[student.id];
            const isTicking      = ticking.has(student.id);
            const gateScan       = gateMap[student.id];

            return (
              <div
                key={student.id}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-0 transition-colors"
                style={{
                  borderColor: "var(--border)",
                  background: classConfirmed ? "var(--status-success-bg)" : gateScanned ? "var(--status-info-bg)" : "transparent",
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: classConfirmed ? "var(--status-success-bg)" : gateScanned ? "var(--status-info-bg)" : "var(--bg-subtle)",
                    color: classConfirmed ? "var(--status-success)" : gateScanned ? "var(--status-info)" : "var(--text-muted)",
                  }}
                >
                  {getInitials(student.full_name)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {student.full_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {student.class_name && <span className="text-[10px] badge-gray">{student.class_name}</span>}
                    {gateScanned && gateScan && (
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--status-info)" }}>
                        <ScanLine size={9} />
                        Gate {formatTime(gateScan.scanned_at)}
                        {gateScan.status === "late" && " (late)"}
                      </span>
                    )}
                    {classConfirmed && classMap[student.id] && (
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--status-success)" }}>
                        <CheckSquare size={9} />
                        In class {formatTime(classMap[student.id].scanned_at)}
                      </span>
                    )}
                    {!gateScanned && !classConfirmed && (
                      <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>Not scanned at gate</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleTick(student)}
                  disabled={isTicking}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all shrink-0"
                  style={classConfirmed
                    ? { background: "var(--status-success-bg)", borderColor: "var(--status-success)", color: "var(--status-success)" }
                    : { borderColor: "var(--border)", color: "var(--text-muted)" }}
                  title={classConfirmed ? "Untick (wrong)" : "Mark as in class"}
                >
                  {isTicking ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                  ) : classConfirmed ? (
                    <><Check size={13} /> Present</>
                  ) : (
                    <><Square size={13} /> Tick</>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
        Ticks create a separate classroom attendance record. Tap a ticked student to untick (correct a mistake). One tick per student per day per class.
      </p>
    </div>
  );
}
