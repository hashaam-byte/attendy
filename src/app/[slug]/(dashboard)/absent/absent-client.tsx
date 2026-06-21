"use client";
// src/app/[slug]/(dashboard)/absent/absent-client.tsx — ATTENDY-EDU v5
// Theme-safe rewrite.

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  UserX, Search, Phone, CheckCircle, MessageSquare,
  AlertTriangle, Loader2, Download, ArrowLeft,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import Link from "next/link";

type Student = {
  id: string;
  full_name: string;
  class_name: string | null;
  parent_phone: string | null;
  employee_id: string | null;
};

const EXCUSE_REASONS = [
  "Sick", "Family emergency", "School trip",
  "Bereavement", "Sports event", "Parent excuse", "Other",
];

interface Props {
  absentStudents: Student[];
  total: number;
  orgId: string;
  role: string;
  today: string;
  slug: string;
}

export function AbsentClient({ absentStudents, total, orgId, role, today, slug }: Props) {
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
      const matchSearch = !search ||
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
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
      ...displayStudents.map((s) => [
        s.full_name, s.class_name ?? "", s.parent_phone ?? "", s.employee_id ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `absent-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href={`/${slug}/dashboard`} className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div className="flex-1">
          <h2 className="page-title">Absent Today</h2>
          <p className="page-sub">
            {displayStudents.length} absent · {presentCount} present · {attendancePct}% attendance
          </p>
        </div>
        <button onClick={downloadCSV} className="btn-secondary text-sm">
          <Download size={15} />Export CSV
        </button>
      </div>

      {/* Attendance bar */}
      <div className="card p-4">
        <div className="flex justify-between text-xs mb-2" style={{ color: "var(--text-muted)" }}>
          <span>{presentCount} present</span>
          <span className="font-semibold">{attendancePct}%</span>
          <span>{displayStudents.length} absent</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--status-danger-bg)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${attendancePct}%`, background: "var(--status-success)" }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
          <input
            className="input-base pl-9"
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-base w-auto" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          {classes.map((c) => (
            <option key={c} value={c}>{c === "all" ? "All Classes" : c}</option>
          ))}
        </select>
      </div>

      {displayStudents.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle size={40} className="mx-auto mb-3" style={{ color: "var(--status-success)" }} />
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>All students accounted for!</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-faint)" }}>
            Everyone has been scanned or marked excused today.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border)", background: "var(--status-danger-bg)" }}>
            <AlertTriangle size={14} style={{ color: "var(--status-danger)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--status-danger)" }}>
              {displayStudents.length} student{displayStudents.length !== 1 ? "s" : ""} not yet scanned today
            </span>
          </div>

          {displayStudents.map((student) => (
            <div key={student.id}>
              <div className="flex items-center gap-3 px-5 py-4 border-b last:border-0 transition-colors" style={{ borderColor: "var(--border)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--status-danger-bg)", color: "var(--status-danger)" }}>
                  {getInitials(student.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/${slug}/students/${student.id}`}
                    className="font-medium truncate block hover:underline"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {student.full_name}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    {student.class_name && (
                      <span className="badge-gray text-[10px]">{student.class_name}</span>
                    )}
                    {student.parent_phone && (
                      <a
                        href={`tel:${student.parent_phone}`}
                        className="flex items-center gap-1 text-[10px] transition-colors"
                        style={{ color: "var(--text-faint)" }}
                      >
                        <Phone size={10} />{student.parent_phone}
                      </a>
                    )}
                  </div>
                </div>

                {(role === "admin" || role === "teacher") && (
                  <div className="flex items-center gap-2 shrink-0">
                    {student.parent_phone && (
                      <a
                        href={`https://wa.me/${student.parent_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, ${student.full_name} has not been scanned at school today. Please let us know if they are absent.`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--status-success)" }}
                        title="WhatsApp parent"
                      >
                        <MessageSquare size={14} />
                      </a>
                    )}
                    {role === "admin" && (
                      <button
                        onClick={() => setExcusing(excusing === student.id ? null : student.id)}
                        className="btn-secondary text-xs py-1.5"
                      >
                        <CheckCircle size={12} />Excuse
                      </button>
                    )}
                  </div>
                )}
              </div>

              {excusing === student.id && (
                <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)", background: "var(--status-warning-bg)" }}>
                  <p className="text-xs font-medium mb-3" style={{ color: "var(--status-warning)" }}>
                    Mark {student.full_name} as excused today
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {EXCUSE_REASONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setExcuseReason(r)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                        style={excuseReason === r
                          ? { background: "var(--status-warning-bg)", borderColor: "var(--status-warning)", color: "var(--status-warning)" }
                          : { borderColor: "var(--border)", color: "var(--text-secondary)" }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <input
                    className="input-base mb-3 text-xs"
                    placeholder="Optional note…"
                    value={excuseNote}
                    onChange={(e) => setExcuseNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setExcusing(null)} className="btn-secondary text-xs py-1.5">
                      Cancel
                    </button>
                    <button
                      onClick={() => handleExcuse(student)}
                      disabled={loading === student.id}
                      className="btn-primary text-xs py-1.5"
                      style={{ background: "var(--status-warning)" }}
                    >
                      {loading === student.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <CheckCircle size={12} />
                      }
                      Mark Excused
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
