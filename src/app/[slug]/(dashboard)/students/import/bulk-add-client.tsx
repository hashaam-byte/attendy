"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Trash2, Loader2, CheckCircle, AlertCircle,
  Users, Sparkles, ChevronDown, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasFeature, minPlanFor } from "@/lib/plan-features";

const CLASSES = [
  "Nursery 1", "Nursery 2", "Nursery 3",
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3",
];

type Row = {
  key:          string;
  full_name:    string;
  class_name:   string;
  parent_phone: string;
  employee_id:  string;
};

function emptyRow(): Row {
  return {
    key: Math.random().toString(36).slice(2),
    full_name: "", class_name: "", parent_phone: "", employee_id: "",
  };
}

function validateRow(r: Row): string[] {
  const errors: string[] = [];
  if (!r.full_name.trim()) errors.push("Name required");
  if (!r.class_name) errors.push("Class required");
  const digits = r.parent_phone.replace(/\D/g, "");
  if (!digits) errors.push("Parent phone required");
  else if (digits.length < 10) errors.push("Phone too short");
  return errors;
}

interface Props {
  orgId:       string;
  orgName:     string;
  slug:        string;
  plan:        string;
  studentCount: number;
  maxMembers:  number;
}

export function BulkAddClient({ orgId, orgName, slug, plan, studentCount, maxMembers }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const isPremium = hasFeature(plan, "quickAddStudents");

  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: { row: number; name: string; error: string }[] } | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  function updateRow(key: string, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function addMultipleRows(n: number) {
    setRows((prev) => [...prev, ...Array.from({ length: n }, emptyRow)]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  function duplicateLastClass() {
    const last = rows[rows.length - 1];
    if (!last?.class_name) return;
    setRows((prev) => [...prev, { ...emptyRow(), class_name: last.class_name }]);
  }

  const filledRows = rows.filter((r) => r.full_name.trim() || r.class_name || r.parent_phone.trim());
  const rowErrors = new Map(filledRows.map((r) => [r.key, validateRow(r)]));
  const validRows = filledRows.filter((r) => (rowErrors.get(r.key) ?? []).length === 0);
  const remaining = maxMembers - studentCount;

  async function handleSubmit() {
    if (validRows.length === 0) return;
    setSubmitting(true);
    setResult(null);

    if (validRows.length > remaining) {
      setResult({
        inserted: 0,
        errors: [{ row: 0, name: "—", error: `Your plan allows ${maxMembers} students. You have ${studentCount} and tried to add ${validRows.length}, which is ${validRows.length - remaining} over your limit.` }],
      });
      setSubmitting(false);
      return;
    }

    const inserts = validRows.map((r) => ({
      organisation_id: orgId,
      full_name:        r.full_name.trim(),
      class_name:        r.class_name,
      parent_phone:      r.parent_phone.replace(/\D/g, ""),
      employee_id:       r.employee_id.trim() || null,
      member_type:       "student",
      role:              "viewer",
      is_active:         true,
    }));

    const { data, error } = await supabase.from("members").insert(inserts).select("id");

    if (error) {
      setResult({ inserted: 0, errors: [{ row: 0, name: "—", error: error.message }] });
    } else {
      setResult({ inserted: data?.length ?? 0, errors: [] });
      // Fire registration SMS for each (best-effort, non-blocking)
      (data ?? []).forEach((m) => {
        fetch("/api/notify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "registration", member_id: m.id, org_id: orgId }),
        }).catch(() => {});
      });
      router.refresh();
    }
    setSubmitting(false);
  }

  if (!isPremium) {
    return (
      <div className="card p-6 text-center space-y-3" style={{ background: "var(--accent-bg)", borderColor: "var(--border-strong)" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--accent-bg-strong)" }}>
          <Sparkles size={22} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Quick Add requires the {minPlanFor("quickAddStudents")} plan</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Add students one row at a time without preparing a CSV file — just like adding environment
            variables on Vercel. Upgrade to {minPlanFor("quickAddStudents")} to unlock it. CSV import below remains available on your current plan.
          </p>
        </div>
        <a
          href="https://wa.me/2348077291745?text=Hi%20Attendy%2C%20I%27d%20like%20to%20upgrade%20to%20Premium%20for%20Quick%20Add"
          target="_blank" rel="noopener noreferrer"
          className="btn-primary text-xs inline-flex"
        >
          Upgrade to Premium →
        </a>
      </div>
    );
  }

  if (result) {
    return (
      <div className={cn("card p-6 space-y-4 border-2")} style={{
        borderColor: result.errors.length === 0 ? "var(--status-success)" : "var(--status-warning)",
        background: result.errors.length === 0 ? "var(--status-success-bg)" : "var(--status-warning-bg)",
      }}>
        <div className="flex items-center gap-3">
          {result.errors.length === 0
            ? <CheckCircle size={20} style={{ color: "var(--status-success)" }} />
            : <AlertCircle size={20} style={{ color: "var(--status-warning)" }} />}
          <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>
            {result.inserted > 0 ? `${result.inserted} student${result.inserted !== 1 ? "s" : ""} added!` : "Could not add students"}
          </h3>
        </div>
        {result.errors.length > 0 && (
          <div className="space-y-1">
            {result.errors.map((e, i) => (
              <p key={i} className="text-xs font-mono" style={{ color: "var(--status-danger)" }}>{e.error}</p>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => { setResult(null); setRows([emptyRow(), emptyRow(), emptyRow()]); }} className="btn-secondary text-sm">
            Add More Students
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
            <Sparkles size={14} style={{ color: "var(--accent)" }} />
            Quick Add
            <span className="badge text-[9px]" style={{ background: "var(--accent-bg-strong)", color: "var(--accent)" }}>PREMIUM</span>
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {validRows.length} ready to add · {remaining} slot{remaining !== 1 ? "s" : ""} remaining on your plan
          </p>
        </div>
      </div>

      {/* Column headers (desktop) */}
      <div className="hidden sm:grid grid-cols-[1fr_140px_140px_120px_32px] gap-2 px-1">
        {["Full name", "Class", "Parent phone", "Student ID (optional)", ""].map((h) => (
          <span key={h} className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {rows.map((row, i) => {
          const errors = (row.full_name.trim() || row.class_name || row.parent_phone.trim())
            ? validateRow(row)
            : [];
          return (
            <div key={row.key} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_120px_32px] gap-2 items-center">
              <input
                className="input-base text-sm"
                placeholder={`Student ${i + 1} full name`}
                value={row.full_name}
                onChange={(e) => updateRow(row.key, "full_name", e.target.value)}
              />
              <select
                className="input-base text-sm"
                value={row.class_name}
                onChange={(e) => updateRow(row.key, "class_name", e.target.value)}
              >
                <option value="">Class…</option>
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                className="input-base text-sm"
                placeholder="08012345678"
                value={row.parent_phone}
                onChange={(e) => updateRow(row.key, "parent_phone", e.target.value)}
              />
              <input
                className="input-base text-sm font-mono"
                placeholder="Auto"
                value={row.employee_id}
                onChange={(e) => updateRow(row.key, "employee_id", e.target.value)}
              />
              <button
                onClick={() => removeRow(row.key)}
                disabled={rows.length <= 1}
                className="p-2 rounded-lg transition-colors disabled:opacity-30 self-center"
                style={{ color: "var(--status-danger)" }}
                title="Remove row"
              >
                <Trash2 size={14} />
              </button>
              {errors.length > 0 && (
                <p className="sm:col-span-5 text-[10px] -mt-1" style={{ color: "var(--status-danger)" }}>
                  {errors.join(" · ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add row controls — the "+" pattern, like Vercel env var boxes */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={addRow}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border-2 border-dashed transition-colors"
          style={{ borderColor: "var(--border-strong)", color: "var(--accent)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-bg)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <Plus size={13} /> Add another student
        </button>
        <button onClick={() => addMultipleRows(5)} className="btn-ghost text-xs py-1.5">
          +5 rows
        </button>
        {rows[rows.length - 1]?.class_name && (
          <button onClick={duplicateLastClass} className="btn-ghost text-xs py-1.5 gap-1">
            <Copy size={11} /> +1 row, same class
          </button>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={handleSubmit}
          disabled={submitting || validRows.length === 0}
          className="btn-primary"
        >
          {submitting
            ? <><Loader2 size={14} className="animate-spin" /> Adding…</>
            : <><Users size={14} /> Add {validRows.length} Student{validRows.length !== 1 ? "s" : ""}</>}
        </button>
        {filledRows.length > validRows.length && (
          <span className="text-xs" style={{ color: "var(--status-warning)" }}>
            {filledRows.length - validRows.length} row{filledRows.length - validRows.length !== 1 ? "s" : ""} have errors and will be skipped
          </span>
        )}
      </div>
    </div>
  );
}
