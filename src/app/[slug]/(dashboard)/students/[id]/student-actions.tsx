"use client";
// src/app/[slug]/(dashboard)/students/[id]/student-actions.tsx — ATTENDY-EDU v3
// Handles: Edit info modal, Suspend, Reactivate, Delete (with confirm dialog).

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Edit2, ShieldOff, UserCheck, Trash2, Loader2,
  CheckCircle, X, AlertTriangle, QrCode, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Student {
  id: string;
  full_name: string;
  class_name: string | null;
  parent_phone: string | null;
  employee_id: string | null;
  notes: string | null;
  is_active: boolean;
}

interface Props {
  student: Student;
  slug: string;
  role: string;
  classes: string[];
}

// ── Small confirm dialog ────────────────────────────────────
function ConfirmDialog({
  title, message, confirmLabel, danger,
  loading, onConfirm, onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            danger ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30")}>
            <AlertTriangle size={18} className={danger ? "text-red-500" : "text-amber-500"} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-[#6b9e7a] mt-1 leading-relaxed">{message}</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5">
            <X size={14} />
          </button>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center text-xs py-2">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "btn-primary flex-1 justify-center text-xs py-2",
              danger ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
            )}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit modal ──────────────────────────────────────────────
function EditModal({
  student, classes, onClose, onSaved,
}: {
  student: Student;
  classes: string[];
  onClose: () => void;
  onSaved: (updated: Partial<Student>) => void;
}) {
  const [form, setForm] = useState({
    full_name:    student.full_name,
    class_name:   student.class_name ?? "",
    parent_phone: student.parent_phone ?? "",
    employee_id:  student.employee_id ?? "",
    notes:        student.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setError(null);
  }

  async function handleSave() {
    if (!form.full_name.trim()) { setError("Full name is required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/manage-student", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id:   student.id,
          full_name:    form.full_name,
          class_name:   form.class_name || null,
          parent_phone: form.parent_phone || null,
          employee_id:  form.employee_id || null,
          notes:        form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      onSaved({
        full_name:    form.full_name,
        class_name:   form.class_name || null,
        parent_phone: form.parent_phone || null,
        employee_id:  form.employee_id || null,
        notes:        form.notes || null,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md shadow-2xl animate-in fade-in-0 slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#bbf7d0] dark:border-[#1a3a24]">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Edit2 size={14} className="text-green-600 dark:text-green-400" />
            Edit Student Info
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-green-950/30 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              className="input-base"
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
            />
          </div>

          {/* Class */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">Class</label>
            <select
              className="input-base"
              value={form.class_name}
              onChange={(e) => update("class_name", e.target.value)}
            >
              <option value="">— No class —</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Parent phone */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">
              Parent / Guardian Phone
            </label>
            <input
              className="input-base"
              type="tel"
              placeholder="08012345678"
              value={form.parent_phone}
              onChange={(e) => update("parent_phone", e.target.value)}
            />
          </div>

          {/* Student ID */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">Student ID</label>
            <input
              className="input-base font-mono"
              placeholder="e.g. GF-2024-001"
              value={form.employee_id}
              onChange={(e) => update("employee_id", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">Notes</label>
            <textarea
              className="input-base resize-none"
              rows={2}
              placeholder="Any special notes…"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────
export function StudentActions({ student: initial, slug, role, classes }: Props) {
  const router = useRouter();
  const [student, setStudent] = useState(initial);
  const [showEdit, setShowEdit] = useState(false);
  const [confirm, setConfirm] = useState<"suspend" | "reactivate" | "delete" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin   = role === "admin";
  const canEdit   = ["admin", "teacher"].includes(role);

  async function handleSuspend() {
    setActionLoading(true);
    const res = await fetch("/api/manage-student", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: student.id, is_active: false }),
    });
    if (res.ok) {
      setStudent((s) => ({ ...s, is_active: false }));
      router.refresh();
    }
    setActionLoading(false);
    setConfirm(null);
  }

  async function handleReactivate() {
    setActionLoading(true);
    const res = await fetch("/api/manage-student", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: student.id, is_active: true }),
    });
    if (res.ok) {
      setStudent((s) => ({ ...s, is_active: true }));
      router.refresh();
    }
    setActionLoading(false);
    setConfirm(null);
  }

  async function handleDelete() {
    setActionLoading(true);
    const res = await fetch(
      `/api/manage-student?student_id=${encodeURIComponent(student.id)}`,
      { method: "DELETE" }
    );
    setActionLoading(false);
    setConfirm(null);
    if (res.ok) {
      // Navigate back to students list after deletion
      router.push(`/${slug}/students`);
      router.refresh();
    }
  }

  return (
    <>
      {/* Action buttons */}
      <div className="card p-4 flex flex-wrap gap-2">
        <Link href={`/${slug}/qr-cards?id=${student.id}`} className="btn-primary text-xs py-1.5">
          <QrCode size={13} />Print QR Card
        </Link>

        {student.parent_phone && (
          <a
            href={`https://wa.me/${student.parent_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, regarding ${student.full_name}...`)}`}
            target="_blank" rel="noopener noreferrer"
            className="btn-secondary text-xs py-1.5"
          >
            <MessageSquare size={13} />Message Parent
          </a>
        )}

        {canEdit && (
          <button
            onClick={() => setShowEdit(true)}
            className="btn-secondary text-xs py-1.5"
          >
            <Edit2 size={13} />Edit Info
          </button>
        )}

        {isAdmin && student.is_active && (
          <button
            onClick={() => setConfirm("suspend")}
            className="btn-secondary text-xs py-1.5 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-950/20"
          >
            <ShieldOff size={13} />Suspend
          </button>
        )}

        {isAdmin && !student.is_active && (
          <button
            onClick={() => setConfirm("reactivate")}
            className="btn-secondary text-xs py-1.5 text-green-600 dark:text-green-400"
          >
            <UserCheck size={13} />Reactivate
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setConfirm("delete")}
            className="btn-secondary text-xs py-1.5 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700/50 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <Trash2 size={13} />Delete Student
          </button>
        )}
      </div>

      {/* Edit modal */}
      {showEdit && (
        <EditModal
          student={student}
          classes={classes}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setStudent((s) => ({ ...s, ...updated }));
            router.refresh();
          }}
        />
      )}

      {/* Suspend confirm */}
      {confirm === "suspend" && (
        <ConfirmDialog
          title="Suspend this student?"
          message={`${student.full_name}'s QR card will be rejected at the gate and a suspension warning shown. You can reactivate at any time.`}
          confirmLabel={actionLoading ? "Suspending…" : "Suspend"}
          loading={actionLoading}
          onConfirm={handleSuspend}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Reactivate confirm */}
      {confirm === "reactivate" && (
        <ConfirmDialog
          title="Reactivate this student?"
          message={`${student.full_name} will be able to scan in at the gate again.`}
          confirmLabel={actionLoading ? "Reactivating…" : "Reactivate"}
          loading={actionLoading}
          onConfirm={handleReactivate}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Delete confirm */}
      {confirm === "delete" && (
        <ConfirmDialog
          title="Permanently delete this student?"
          message={`This will remove ${student.full_name} from the system entirely. Their QR card will stop working immediately and show "Student not found". Historical attendance logs are preserved. This cannot be undone.`}
          confirmLabel={actionLoading ? "Deleting…" : "Delete permanently"}
          danger
          loading={actionLoading}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}