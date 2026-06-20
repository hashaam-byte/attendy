"use client";

import { use, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft, Upload, AlertCircle, CheckCircle,
  Loader2, Download, X, FileText, Users, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BulkAddClient } from "./bulk-add-client";

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

function validateRow(raw: Record<string, string>, rowNum: number): ParsedRow {
  const errors: string[] = [];
  const full_name    = (raw["full_name"] ?? raw["Full Name"] ?? "").trim();
  const class_name   = (raw["class_name"] ?? raw["Class"] ?? "").trim();
  const parent_phone = (raw["parent_phone"] ?? raw["Parent Phone"] ?? "").trim();
  const employee_id  = (raw["employee_id"] ?? raw["Student ID"] ?? "").trim() || undefined;
  const notes        = (raw["notes"] ?? raw["Notes"] ?? "").trim() || undefined;

  if (!full_name)  errors.push("full_name is required");
  if (!class_name) errors.push("class_name is required");
  if (!parent_phone) errors.push("parent_phone is required");
  const digits = parent_phone.replace(/\D/g, "");
  if (parent_phone && digits.length < 10) errors.push("parent_phone must be at least 10 digits");

  return {
    full_name, class_name, parent_phone: digits, employee_id, notes,
    _row: rowNum, _errors: errors, _valid: errors.length === 0,
  };
}

// ── CSV import tab ──────────────────────────────────────────────
function CsvImportTab({ orgId, slug }: { orgId: string | null; slug: string }) {
  const supabase = createClient();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [rows,    setRows]    = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<ImportResult | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [maxErr,  setMaxErr]  = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setFileErr(null); setRows([]); setResult(null);
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setFileErr("Please upload a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const Papa = (await import("papaparse" as any)).default ?? (await import("papaparse" as any));
      const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
      if (!parsed.data || parsed.data.length === 0) {
        setFileErr("CSV is empty or has no data rows.");
        return;
      }
      const validated = (parsed.data as Record<string, string>[]).map((raw, i) => validateRow(raw, i + 2));
      setRows(validated);
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  async function handleImport() {
    if (!orgId || rows.length === 0) return;
    setLoading(true); setMaxErr(null);
    const validRows = rows.filter(r => r._valid);

    const { data: org } = await supabase.from("organisations").select("max_members").eq("id", orgId).single();
    const { count: currentCount } = await supabase
      .from("members").select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId).eq("is_active", true);

    const limit     = org?.max_members ?? 30;
    const remaining = limit - (currentCount ?? 0);

    if (validRows.length > remaining) {
      setMaxErr(`Your plan allows ${limit} students. You currently have ${currentCount ?? 0}. You can only import ${remaining} more, but this file has ${validRows.length} valid rows.`);
      setLoading(false);
      return;
    }

    const result: ImportResult = { inserted: 0, skipped: 0, errors: [] };
    const BATCH = 25;
    for (let i = 0; i < validRows.length; i += BATCH) {
      const batch = validRows.slice(i, i + BATCH).map(r => ({
        organisation_id: orgId, full_name: r.full_name, class_name: r.class_name || null,
        parent_phone: r.parent_phone || null, employee_id: r.employee_id || null,
        notes: r.notes || null, member_type: "student", role: "viewer", is_active: true,
      }));
      const { data, error } = await supabase.from("members").insert(batch).select("id");
      if (error) {
        batch.forEach((_, j) => result.errors.push({ row: i + j + 2, name: validRows[i + j]?.full_name ?? "Unknown", error: error.message }));
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

  if (result) {
    return (
      <div className={cn("card p-5 border-2")} style={{
        borderColor: result.errors.length === 0 ? "var(--status-success)" : "var(--status-warning)",
        background: result.errors.length === 0 ? "var(--status-success-bg)" : "var(--status-warning-bg)",
      }}>
        <div className="flex items-center gap-3 mb-3">
          {result.errors.length === 0
            ? <CheckCircle size={20} style={{ color: "var(--status-success)" }} />
            : <AlertCircle size={20} style={{ color: "var(--status-warning)" }} />}
          <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>
            Import {result.errors.length === 0 ? "complete" : "finished with issues"}
          </h3>
        </div>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          ✓ {result.inserted} students added{result.skipped > 0 && ` · ✗ ${result.skipped} rows skipped`}
        </p>
        {result.errors.length > 0 && (
          <div className="space-y-1 mt-2">
            {result.errors.slice(0, 5).map((e, i) => (
              <p key={i} className="text-xs font-mono" style={{ color: "var(--status-danger)" }}>Row {e.row} · {e.name} — {e.error}</p>
            ))}
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <Link href={`/${slug}/students`} className="btn-primary text-sm"><Users size={14} /> View Students</Link>
          <button onClick={() => { setResult(null); setRows([]); }} className="btn-secondary text-sm">Import Another File</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText size={16} style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Step 1 — Download the template</h3>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Required columns: <code className="px-1 rounded" style={{ background: "var(--bg-subtle)" }}>full_name</code>,{" "}
          <code className="px-1 rounded" style={{ background: "var(--bg-subtle)" }}>class_name</code>,{" "}
          <code className="px-1 rounded" style={{ background: "var(--bg-subtle)" }}>parent_phone</code>.
        </p>
        <button onClick={downloadTemplate} className="btn-secondary text-sm"><Download size={14} /> Download CSV Template</button>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Upload size={16} style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Step 2 — Upload your completed CSV</h3>
        </div>
        <div
          onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all"
          style={{ borderColor: rows.length > 0 ? "var(--accent)" : "var(--border-strong)", background: rows.length > 0 ? "var(--accent-bg)" : "transparent" }}
        >
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          <Upload size={28} className="mx-auto mb-3" style={{ color: rows.length > 0 ? "var(--accent)" : "var(--text-faint)" }} />
          {rows.length > 0 ? (
            <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{rows.length} rows parsed — click to replace</p>
          ) : (
            <>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Drag & drop your CSV here, or click to browse</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>.csv files only</p>
            </>
          )}
        </div>
        {fileErr && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: "var(--status-danger-bg)", color: "var(--status-danger)" }}>
            <AlertCircle size={14} /> {fileErr}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Preview — {rows.length} rows</h3>
              <p className="text-xs mt-0.5">
                <span className="font-semibold" style={{ color: "var(--status-success)" }}>{validCount} valid</span>
                {invalidCount > 0 && <> · <span className="font-semibold" style={{ color: "var(--status-danger)" }}>{invalidCount} invalid</span></>}
              </p>
            </div>
            <button onClick={() => setRows([])} style={{ color: "var(--icon-default)" }}><X size={16} /></button>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: "var(--bg-subtle)" }}>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  {["Row", "Name", "Class", "Parent Phone", "Student ID", "Status"].map(h => <th key={h} className="table-th">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._row} className="table-row" style={!row._valid ? { background: "var(--status-danger-bg)" } : {}}>
                    <td className="table-td font-mono text-xs">{row._row}</td>
                    <td className="table-td font-medium">{row.full_name || "—"}</td>
                    <td className="table-td">{row.class_name || "—"}</td>
                    <td className="table-td font-mono text-xs">{row.parent_phone || "—"}</td>
                    <td className="table-td font-mono text-xs">{row.employee_id || "—"}</td>
                    <td className="table-td">
                      {row._valid
                        ? <span className="badge-green text-[10px]">Valid</span>
                        : <span className="badge-red text-[10px]" title={row._errors.join(", ")}>{row._errors[0]}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t flex items-center justify-between gap-4 flex-wrap" style={{ borderColor: "var(--border)" }}>
            {maxErr && <p className="text-xs flex items-center gap-1" style={{ color: "var(--status-danger)" }}><AlertCircle size={12} /> {maxErr}</p>}
            {validCount > 0 && !maxErr && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Ready to import {validCount} student{validCount !== 1 ? "s" : ""}.
                {invalidCount > 0 && ` ${invalidCount} invalid row${invalidCount !== 1 ? "s" : ""} will be skipped.`}
              </p>
            )}
            <button onClick={handleImport} disabled={loading || validCount === 0} className="btn-primary text-sm ml-auto disabled:opacity-50">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : <><Upload size={14} /> Import {validCount} Students</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function ImportStudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router   = useRouter();
  const supabase = createClient();

  const [orgId,        setOrgId]        = useState<string | null>(null);
  const [orgName,      setOrgName]      = useState("");
  const [plan,         setPlan]         = useState("trial");
  const [studentCount, setStudentCount] = useState(0);
  const [maxMembers,   setMaxMembers]   = useState(30);
  const [loadingMeta,  setLoadingMeta]  = useState(true);
  const [tab,          setTab]          = useState<"quick" | "csv">("quick");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${slug}/login`); return; }
      const { data: orgUser } = await supabase
        .from("org_users").select("role, organisation_id").eq("user_id", user.id).eq("is_active", true).single();
      if (!orgUser || orgUser.role !== "admin") { router.push(`/${slug}/dashboard`); return; }

      const [{ data: org }, { count }] = await Promise.all([
        supabase.from("organisations").select("name, plan, max_members").eq("id", orgUser.organisation_id).single(),
        supabase.from("members").select("*", { count: "exact", head: true })
          .eq("organisation_id", orgUser.organisation_id).eq("member_type", "student").eq("is_active", true),
      ]);

      setOrgId(orgUser.organisation_id);
      if (org) { setOrgName(org.name); setPlan(org.plan); setMaxMembers(org.max_members ?? 30); }
      setStudentCount(count ?? 0);
      setLoadingMeta(false);
    })();
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${slug}/students`} className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div>
          <h2 className="page-title">Add Students</h2>
          <p className="page-sub">Quick Add a few students, or bulk import via CSV</p>
        </div>
      </div>

      {loadingMeta ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { id: "quick" as const, label: "Quick Add", icon: Sparkles },
              { id: "csv" as const,   label: "CSV Import", icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={tab === id
                  ? { background: "var(--accent)", color: "white" }
                  : { color: "var(--text-muted)" }}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {tab === "quick" ? (
            <BulkAddClient
              orgId={orgId ?? ""}
              orgName={orgName}
              slug={slug}
              plan={plan}
              studentCount={studentCount}
              maxMembers={maxMembers}
            />
          ) : (
            <CsvImportTab orgId={orgId} slug={slug} />
          )}
        </>
      )}
    </div>
  );
}
