"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, QrCode, UserCheck, UserX, Eye } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

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

export function StudentsClient({
  students,
  orgId,
  role,
  maxMembers,
  activeCount,
}: {
  students: Student[];
  orgId: string;
  role: string;
  maxMembers: number;
  activeCount: number;
}) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  const classes = useMemo(() => {
    const set = new Set(students.map((s) => s.class_name).filter(Boolean) as string[]);
    return ["all", ...Array.from(set).sort()];
  }, [students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
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
    });
  }, [students, search, classFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#4a7a5a]" />
          <input
            className="input-base pl-9"
            placeholder="Search name, class, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="input-base w-auto"
        >
          {classes.map((c) => (
            <option key={c} value={c}>{c === "all" ? "All Classes" : c}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-base w-auto"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">
        Showing {filtered.length} of {students.length} students
      </p>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-50 dark:bg-green-950/20">
              <tr className="border-b border-[#bbf7d0] dark:border-[#1a3a24]">
                <th className="table-th">Student</th>
                <th className="table-th">Class</th>
                <th className="table-th hidden md:table-cell">Parent Phone</th>
                <th className="table-th hidden sm:table-cell">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id} className={cn("table-row", !student.is_active && "opacity-60")}>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-400 shrink-0">
                        {getInitials(student.full_name)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{student.full_name}</p>
                        {student.employee_id && (
                          <p className="text-[10px] font-mono text-slate-400 dark:text-[#4a7a5a]">
                            {student.employee_id}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    {student.class_name ? (
                      <span className="badge-green">{student.class_name}</span>
                    ) : "—"}
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
                      <Link
                        href={`/students/${student.id}`}
                        className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        title="View profile"
                      >
                        <Eye size={14} />
                      </Link>
                      <Link
                        href={`/students/${student.id}/qr`}
                        className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        title="View QR card"
                      >
                        <QrCode size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="text-slate-400 dark:text-[#4a7a5a]">
                      <Search size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">
                        {search || classFilter !== "all" || statusFilter !== "all"
                          ? "No students match your filters"
                          : "No students yet. Add your first student."}
                      </p>
                      {!search && students.length === 0 && (
                        <Link href="/students/register" className="btn-primary mt-3 inline-flex">
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