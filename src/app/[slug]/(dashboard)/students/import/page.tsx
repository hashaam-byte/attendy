"use client";

import { use, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft, Upload, AlertCircle, CheckCircle,
  Loader2, Download, X, FileText, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────
interface CsvRow {
  full_name:    string;
  class_name:   string;
  parent_phone: string;
  employee_id?: string;
  notes?:       string;
}

interface ParsedRow extends CsvRow {
  _row:    number;
  _errors: string[];
  _valid:  boolean;
}

interface ImportResult {
  inserted: number;
  skipped:  number;
  errors:   { row: number; name: string; error: string }[];
}

// ── CSV template download ────────────────────────────────────
function downloadTemplate() {
  const csv = [
    "full_name,class_name,parent_phone,employee_id,notes",
    "Adaeze Okonkwo,JSS 1,08012345678,SC-001,",
    "Emeka Nwosu,JSS 2,07098765432,SC-002,Scholarship student",
    "Fatima Bello,Primary 6,08034567890,,",
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "attendy_students_template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Row validator ─────────────────────────────────────────────
function validateRow(raw: Record<string, string>, rowNum: number): ParsedRow {
  const errors: string[] = [];

  const full_name    = (raw["full_name"] ?? raw["Full Name"] ?? "").trim();
  const class_name   = (raw["class_name"] ?? raw["Class"] ?? "").trim();
  const parent_phone = (raw["parent_phone"] ?? raw["Parent Phone"] ?? "").trim();
  const employee_id  = (raw["employee_id"] ?? raw["Student ID"] ?? "").trim() || undefined;
  const notes        = (raw["notes"] ?? raw["Notes"] ?? "").trim() || undefined;

  if (!full_name)                          errors.push("full_name is required");
  if (!class_name)                         errors.push("class_name is required");
  if (!parent_phone)                       errors.push("parent_phone is required");
  const digits = parent_phone.replace(/\D/g, "");
  if (parent_phone && digits.length < 10) errors.push("parent_phone must be at least 10 digits");

  return {
    full_name,
    class_name,
    parent_phone: digits,
    employee_id,
    notes,
    _row:    rowNum,
    _errors: errors,
    _valid:  errors.length === 0,
  };
}

// ── Main component ────────────────────────────────────────────
export default function ImportStudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router   = useRouter();
  const supabase = createClient();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [rows,     setRows]     = useState<ParsedRow[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<ImportResult | null>(null);
  const [orgId,    setOrgId]    = useState<string | null>(null);
  const [orgName,  setOrgName]  = useState<string>("");
  const [fileErr,  setFileErr]  = useState<string | null>(null);
  const [maxErr,   setMaxErr]   = useState<string | null>(null);

  // Load org on mount
  useState(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${slug}/login`); return; }
      const { data: orgUser } = await supabase
        .from("org_users")
        .select("role, organisation_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      if (!orgUser || orgUser.role !== "admin") {
        router.push(`/${slug}/dashboard`);
        return;
      }
      setOrgId(orgUser.organisation_id);
      const { data: org } = await supabase
        .from("organisations")
        .select("name, max_members")
        .eq("id", orgUser.organisation_id)
        .single();
      if (org) setOrgName(org.name);
    })();
  });

  // ── Parse CSV file ─────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setFileErr(null);
    setRows([]);
    setResult(null);

    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setFileErr("Please upload a .csv file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      // Dynamic import of papaparse
      const Papa = (await import("papaparse" as any)).default ?? (await import("papaparse" as any));
      const parsed = Papa.parse(text.trim(), {
        header:       true,
        skipEmptyLines: true,
      });

      if (!parsed.data || parsed.data.length === 0) {
        setFileErr("CSV is empty or has no data rows.");
        return;
      }

      const validated = (parsed.data as Record<string, string>[]).map(
        (raw, i) => validateRow(raw, i + 2) // row 1 = header
      );

      setRows(validated);
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Import valid rows ──────────────────────────────────────
  async function handleImport() {
    if (!orgId || rows.length === 0) return;
    setLoading(true);
    setMaxErr(null);

    const validRows = rows.filter(r => r._valid);

    // Check member limit
    const { data: org } = await supabase
      .from("organisations")
      .select("max_members")
      .eq("id", orgId)
      .single();
    const { count: currentCount } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("is_active", true);

    const limit     = org?.max_members ?? 30;
    const remaining = limit - (currentCount ?? 0);

    if (validRows.length > remaining) {
      setMaxErr(
        `Your plan allows ${limit} students. You currently have ${currentCount ?? 0}. ` +
        `You can only import ${remaining} more, but this file has ${validRows.length} valid rows. ` +
        `Please reduce the file or upgrade your plan.`
      );
      setLoading(false);
      return;
    }

    const result: ImportResult = { inserted: 0, skipped: 0, errors: [] };

    // Insert in batches of 25 to avoid hitting Supabase row limits
    const BATCH = 25;
    for (let i = 0; i < validRows.length; i += BATCH) {
      const batch = validRows.slice(i, i + BATCH).map(r => ({
        organisation_id: orgId,
        full_name:       r.full_name,
        class_name:      r.class_name || null,
        parent_phone:    r.parent_phone || null,
        employee_id:     r.employee_id  || null,
        notes:           r.notes        || null,
        member_type:     "student",
        role:            "viewer",
        is_active:       true,
      }));

      const { data, error } = await supabase
        .from("members")
        .insert(batch)
        .select("id");

      if (error) {
        // Mark all rows in this batch as errored
        batch.forEach((_, j) => {
          result.errors.push({
            row:   i + j + 2,
            name:  validRows[i + j]?.full_name ?? "Unknown",
            error: error.message,
          });
        });
        result.skipped += batch.length;
      } else {
        result.inserted += (data?.length ?? 0);
      }
    }

    setResult(result);
    setLoading(false);
  }

  const validCount   = rows.filter(r => r._valid).length;
  const invalidCount = rows.filter(r => !r._valid).length;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/${slug}/students`} className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="page-title">Bulk Student Import</h2>
          <p className="page-sub">Upload a CSV to add multiple students at once</p>
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div className={cn(
          "card p-5 border-2",
          result.errors.length === 0
            ? "border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-950/20"
            : "border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20"
        )}>
          <div className="flex items-center gap-3 mb-3">
            {result.errors.length === 0
              ? <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
              : <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
            }
            <h3 className="font-bold text-slate-900 dark:text-white">
              Import {result.errors.length === 0 ? "complete" : "finished with issues"}
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            ✓ {result.inserted} students added
            {result.skipped > 0 && ` · ✗ ${result.skipped} rows skipped`}
          </p>
          {result.errors.length > 0 && (
            <div className="space-y-1 mt-2">
              {result.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs text-red-600 dark:text-red-400 font-mono">
                  Row {e.row} · {e.name} — {e.error}
                </p>
              ))}
              {result.errors.length > 5 && (
                <p className="text-xs text-slate-500">
                  …and {result.errors.length - 5} more errors
                </p>
              )}
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <Link href={`/${slug}/students`} className="btn-primary text-sm">
              <Users size={14} /> View Students
            </Link>
            <button onClick={() => { setResult(null); setRows([]); }} className="btn-secondary text-sm">
              Import Another File
            </button>
          </div>
        </div>
      )}

      {!result && (
        <>
          {/* Template download */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Step 1 — Download the template
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#6b9e7a]">
              Fill in the CSV template with your students. Required columns:
              <span className="font-mono bg-slate-100 dark:bg-[#1a3a24] px-1 rounded ml-1">full_name</span>,
              <span className="font-mono bg-slate-100 dark:bg-[#1a3a24] px-1 rounded ml-1">class_name</span>,
              <span className="font-mono bg-slate-100 dark:bg-[#1a3a24] px-1 rounded ml-1">parent_phone</span>.
              Optional: <span className="font-mono bg-slate-100 dark:bg-[#1a3a24] px-1 rounded ml-1">employee_id</span>,
              <span className="font-mono bg-slate-100 dark:bg-[#1a3a24] px-1 rounded ml-1">notes</span>.
            </p>
            <button onClick={downloadTemplate} className="btn-secondary text-sm">
              <Download size={14} /> Download CSV Template
            </button>
          </div>

          {/* File drop zone */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Upload size={16} className="text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Step 2 — Upload your completed CSV
              </h3>
            </div>

            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
                rows.length > 0
                  ? "border-green-400 dark:border-green-700 bg-green-50/50 dark:bg-green-950/10"
                  : "border-[#bbf7d0] dark:border-[#1a3a24] hover:border-green-400 dark:hover:border-green-700"
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              <Upload size={28} className={cn(
                "mx-auto mb-3",
                rows.length > 0 ? "text-green-500" : "text-slate-300 dark:text-slate-600"
              )} />
              {rows.length > 0 ? (
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {rows.length} rows parsed — click to replace
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Drag & drop your CSV here, or click to browse
                  </p>
                  <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-1">.csv files only</p>
                </>
              )}
            </div>

            {fileErr && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400">
                <AlertCircle size={14} /> {fileErr}
              </div>
            )}
          </div>

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#bbf7d0] dark:border-[#1a3a24]">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Preview — {rows.length} rows
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-0.5">
                    <span className="text-green-600 dark:text-green-400 font-semibold">{validCount} valid</span>
                    {invalidCount > 0 && (
                      <> · <span className="text-red-500 font-semibold">{invalidCount} invalid</span></>
                    )}
                  </p>
                </div>
                <button onClick={() => setRows([])} className="text-slate-400 hover:text-red-500 p-1">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-sm">
                  <thead className="bg-green-50 dark:bg-green-950/20 sticky top-0">
                    <tr className="border-b border-[#bbf7d0] dark:border-[#1a3a24]">
                      <th className="table-th">Row</th>
                      <th className="table-th">Name</th>
                      <th className="table-th">Class</th>
                      <th className="table-th">Parent Phone</th>
                      <th className="table-th">Student ID</th>
                      <th className="table-th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row._row} className={cn(
                        "table-row",
                        !row._valid && "bg-red-50/50 dark:bg-red-950/10"
                      )}>
                        <td className="table-td font-mono text-xs">{row._row}</td>
                        <td className="table-td font-medium">{row.full_name || "—"}</td>
                        <td className="table-td">{row.class_name || "—"}</td>
                        <td className="table-td font-mono text-xs">{row.parent_phone || "—"}</td>
                        <td className="table-td font-mono text-xs">{row.employee_id || "—"}</td>
                        <td className="table-td">
                          {row._valid ? (
                            <span className="badge-green text-[10px]">Valid</span>
                          ) : (
                            <span
                              className="badge-red text-[10px]"
                              title={row._errors.join(", ")}
                            >
                              {row._errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import button */}
              <div className="px-5 py-4 border-t border-[#bbf7d0] dark:border-[#1a3a24] flex items-center justify-between gap-4 flex-wrap">
                {maxErr && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} /> {maxErr}
                  </p>
                )}
                {validCount > 0 && !maxErr && (
                  <p className="text-xs text-slate-500 dark:text-[#6b9e7a]">
                    Ready to import {validCount} student{validCount !== 1 ? "s" : ""}.
                    {invalidCount > 0 && ` ${invalidCount} invalid row${invalidCount !== 1 ? "s" : ""} will be skipped.`}
                  </p>
                )}
                <button
                  onClick={handleImport}
                  disabled={loading || validCount === 0}
                  className="btn-primary text-sm ml-auto disabled:opacity-50"
                >
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" /> Importing…</>
                    : <><Upload size={14} /> Import {validCount} Students</>
                  }
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}