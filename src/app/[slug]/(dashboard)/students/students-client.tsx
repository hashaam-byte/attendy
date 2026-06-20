"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, QrCode, Eye, Download, Lock, CheckSquare, Square } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { minPlanFor } from "@/lib/plan-features";

type Student = {
  id: string;
  full_name: string;
  class_name: string | null;
  parent_phone: string | null;
  qr_code: string;
  employee_id: string | null;
  is_active: boolean;
  photo_url: string | null;
  created_at: string;
};

interface Props {
  students: Student[];
  orgId: string;
  role: string;
  maxMembers: number;
  activeCount: number;
  slug: string;
  canExport: boolean;
}

export function StudentsClient({ students, orgId, role, maxMembers, activeCount, slug, canExport }: Props) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [exporting, setExporting] = useState(false);

  const classes = useMemo(() => {
    const set = new Set(students.map((s) => s.class_name).filter(Boolean) as string[]);
    return ["all", ...Array.from(set).sort()];
  }, [students]);

  const filtered = useMemo(() =>
    students.filter((s) => {
      const matchSearch =
        !search ||
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.class_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.employee_id ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.parent_phone ?? "").includes(search);
      const matchClass = classFilter === "all" || s.class_name === classFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? s.is_active : !s.is_active);
      return matchSearch && matchClass && matchStatus;
    }),
    [students, search, classFilter, statusFilter]
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected(new Set(filtered.map((s) => s.id)));
  }

  function handleExport(selectionOnly: boolean) {
    if (!canExport) return;
    setExporting(true);
    const params = new URLSearchParams();
    if (classFilter !== "all") params.set("class", classFilter);
    if (statusFilter === "all") params.set("include_inactive", "true");
    if (selectionOnly && selected.size > 0) params.set("ids", Array.from(selected).join(","));
    const url = `/api/students/export?${params.toString()}`;
    // Trigger download via a temporary anchor (keeps it a GET, easy auth via cookies)
    const a = document.createElement("a");
    a.href = url;
    a.click();
    setTimeout(() => setExporting(false), 800);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-45">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
          <input
            className="input-base pl-9"
            placeholder="Search name, class, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="input-base w-auto">
          {classes.map((c) => (
            <option key={c} value={c}>{c === "all" ? "All Classes" : c}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-base w-auto">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Export controls */}
        {role === "admin" && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setSelectMode((v) => !v)}
              className="btn-ghost text-xs py-1.5"
            >
              {selectMode ? "Cancel selection" : "Select rows"}
            </button>
            {canExport ? (
              <div className="flex items-center gap-1.5">
                {selectMode && selected.size > 0 && (
                  <button onClick={() => handleExport(true)} disabled={exporting} className="btn-secondary text-xs py-1.5">
                    <Download size={12} /> Export {selected.size} selected
                  </button>
                )}
                <button onClick={() => handleExport(false)} disabled={exporting} className="btn-secondary text-xs py-1.5">
                  <Download size={12} /> Export {classFilter !== "all" ? classFilter : "All"} (CSV)
                </button>
              </div>
            ) : (
              <a
                href="https://wa.me/2348077291745?text=Hi%20Attendy%2C%20I%27d%20like%20to%20upgrade%20to%20export%20students"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border"
                style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}
                title={`Export requires the ${minPlanFor("studentExport")} plan`}
              >
                <Lock size={11} /> Export ({minPlanFor("studentExport")}+)
              </a>
            )}
          </div>
        )}
      </div>

      {selectMode && (
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <button onClick={selectAllFiltered} className="hover:underline" style={{ color: "var(--accent)" }}>
            Select all {filtered.length} shown
          </button>
          <button onClick={() => setSelected(new Set())} className="hover:underline">Clear</button>
          <span>{selected.size} selected</span>
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
        Showing {filtered.length} of {students.length} students
      </p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: "var(--bg-subtle)" }}>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {selectMode && <th className="table-th w-8"></th>}
                <th className="table-th">Student</th>
                <th className="table-th">Class</th>
                <th className="table-th hidden md:table-cell">Parent Phone</th>
                <th className="table-th hidden sm:table-cell">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id} className="table-row" style={!student.is_active ? { opacity: 0.6 } : {}}>
                  {selectMode && (
                    <td className="table-td">
                      <button onClick={() => toggleSelect(student.id)} style={{ color: selected.has(student.id) ? "var(--accent)" : "var(--text-faint)" }}>
                        {selected.has(student.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                  )}
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                        {getInitials(student.full_name)}
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: "var(--text-primary)" }}>{student.full_name}</p>
                        {student.employee_id && (
                          <p className="text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>{student.employee_id}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    {student.class_name ? <span className="badge-green">{student.class_name}</span> : "—"}
                  </td>
                  <td className="table-td hidden md:table-cell font-mono text-xs">
                    {student.parent_phone ?? "—"}
                  </td>
                  <td className="table-td hidden sm:table-cell">
                    <span className={cn("badge", student.is_active ? "badge-green" : "badge-red")}>
                      {student.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <Link href={`/${slug}/students/${student.id}`}
                        className="p-1.5 rounded-lg transition-colors icon-muted"
                        title="View profile">
                        <Eye size={14} />
                      </Link>
                      <Link href={`/${slug}/qr-cards?id=${student.id}`}
                        className="p-1.5 rounded-lg transition-colors icon-muted"
                        title="QR Card">
                        <QrCode size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={selectMode ? 6 : 5} className="px-5 py-12 text-center">
                    <div style={{ color: "var(--text-faint)" }}>
                      <Search size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">
                        {search || classFilter !== "all" || statusFilter !== "all"
                          ? "No students match your filters"
                          : "No students yet. Add your first student."}
                      </p>
                      {!search && students.length === 0 && (
                        <Link href={`/${slug}/students/register`} className="btn-primary mt-3 inline-flex">
                          Add First Student
                        </Link>
                      )}
                    </div>
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
