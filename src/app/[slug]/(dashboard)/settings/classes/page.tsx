"use client";
// src/app/[slug]/(dashboard)/settings/classes/page.tsx — ATTENDY-EDU
// Manage the school's custom class / group list.
// Works for any institution — primary, secondary, university, lessons, etc.

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, GripVertical, Check, X, Loader2,
  BookOpen, AlertTriangle, ArrowLeft, Info,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type OrgClass = { id: string; name: string; sort_order: number; is_active: boolean };

const DEFAULT_SUGGESTIONS = [
  "Nursery 1","Nursery 2","Nursery 3",
  "Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6",
  "JSS 1","JSS 2","JSS 3","SSS 1","SSS 2","SSS 3",
];

const SUGGESTIONS_BY_TYPE = {
  "Primary/Secondary": ["Nursery 1","Nursery 2","Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6","JSS 1","JSS 2","JSS 3","SSS 1","SSS 2","SSS 3"],
  "University":        ["100 Level","200 Level","300 Level","400 Level","500 Level","Postgraduate"],
  "Lesson Centre":     ["Beginner","Intermediate","Advanced","SAT Prep","WAEC Prep","JAMB Prep","A-Level"],
  "Office / Staff":    ["Management","Operations","Finance","Engineering","Marketing","HR","Support"],
  "Events":            ["VIP","General","Press","Exhibitor","Staff","Volunteer"],
};

export default function ClassesManagementPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router   = useRouter();

  const [classes,      setClasses]      = useState<OrgClass[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [newName,      setNewName]      = useState("");
  const [adding,       setAdding]       = useState(false);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);
  const [activeSuggestionSet, setActiveSuggestionSet] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/org-classes")
      .then((r) => r.json())
      .then((d) => { setClasses(d.classes ?? []); setLoading(false); })
      .catch(() => { setError("Failed to load classes"); setLoading(false); });
  }, []);

  function showMsg(msg: string, isError = false) {
    if (isError) { setError(msg); setSuccess(null); }
    else { setSuccess(msg); setError(null); }
    setTimeout(() => { setError(null); setSuccess(null); }, 4000);
  }

  async function addClass(name: string) {
    if (!name.trim()) return;
    // Don't add duplicates
    if (classes.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) {
      showMsg(`"${name.trim()}" already exists`, true);
      return;
    }
    setAdding(true);
    const res  = await fetch("/api/org-classes", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { showMsg(data.error ?? "Failed to add", true); return; }
    setClasses((prev) => [...prev, data.class]);
    setNewName("");
    showMsg(`"${name.trim()}" added`);
  }

  async function deleteClass(cls: OrgClass) {
    if (!confirm(`Delete "${cls.name}"? Students in this class will keep their class label but the class won't appear in the dropdown.`)) return;
    setDeletingId(cls.id);
    const res  = await fetch("/api/org-classes", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: cls.id }),
    });
    const data = await res.json();
    setDeletingId(null);
    if (!res.ok) { showMsg(data.error ?? "Failed to delete", true); return; }
    setClasses((prev) => prev.filter((c) => c.id !== cls.id));
    showMsg(`"${cls.name}" removed`);
  }

  async function bulkAdd(names: string[]) {
    const toAdd = names.filter(
      (n) => !classes.some((c) => c.name.toLowerCase() === n.toLowerCase())
    );
    if (toAdd.length === 0) { showMsg("All these classes already exist", true); return; }
    setAdding(true);
    let added = 0;
    for (const name of toAdd) {
      const res  = await fetch("/api/org-classes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        setClasses((prev) => [...prev, data.class]);
        added++;
      }
    }
    setAdding(false);
    setActiveSuggestionSet(null);
    showMsg(`Added ${added} class${added !== 1 ? "es" : ""}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${slug}/settings`} className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div>
          <h2 className="page-title">Class & Group Management</h2>
          <p className="page-sub">Define your school's classes, levels, or groups</p>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={14} className="shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 text-sm text-green-700 dark:text-green-400">
          <Check size={14} className="shrink-0" />{success}
        </div>
      )}

      {/* Quick-start suggestions */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-indigo-500" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Quick Start Templates</p>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Pick your institution type to bulk-add common classes. You can still customise afterwards.
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SUGGESTIONS_BY_TYPE).map(([type, names]) => (
            <div key={type} className="relative">
              <button
                onClick={() => setActiveSuggestionSet(activeSuggestionSet === type ? null : type)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                  activeSuggestionSet === type
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-[var(--border)] hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                )}
              >
                {type}
              </button>
              {activeSuggestionSet === type && (
                <div className="absolute left-0 top-full mt-1 z-20 w-56 bg-white dark:bg-[#0d1117] border border-[var(--border)] rounded-xl shadow-lg p-3 space-y-2">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                    Will add {names.filter(n => !classes.some(c => c.name.toLowerCase() === n.toLowerCase())).length} new class(es)
                  </p>
                  {names.map((n) => {
                    const exists = classes.some((c) => c.name.toLowerCase() === n.toLowerCase());
                    return (
                      <div key={n} className={cn("flex items-center gap-2 text-xs", exists ? "text-slate-300 dark:text-slate-600 line-through" : "text-slate-700 dark:text-slate-300")}>
                        {exists ? <Check size={10} className="text-green-500" /> : <div className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600" />}
                        {n}
                      </div>
                    );
                  })}
                  <button
                    onClick={() => bulkAdd(names)}
                    disabled={adding}
                    className="w-full mt-2 btn-primary text-xs py-1.5 justify-center"
                  >
                    {adding ? <Loader2 size={11} className="animate-spin" /> : `Add All`}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add single class */}
      <div className="card p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Add a Custom Class</p>
        <div className="flex gap-2">
          <input
            className="input-base flex-1"
            placeholder="e.g. Year 10A, Level 3, Group B, CS101, Management…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addClass(newName); } }}
          />
          <button
            onClick={() => addClass(newName)}
            disabled={adding || !newName.trim()}
            className="btn-primary px-4 shrink-0 disabled:opacity-50"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Add</>}
          </button>
        </div>
        <div className="flex items-start gap-2 text-xs text-slate-400 dark:text-slate-500">
          <Info size={11} className="shrink-0 mt-0.5" />
          Class names are shared across your school — they appear in the student registration dropdown and in reports.
        </div>
      </div>

      {/* Current classes */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Your Classes {classes.length > 0 && <span className="text-slate-400 font-normal">({classes.length})</span>}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">These appear in student registration and filtering</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
            <Loader2 size={16} className="animate-spin" /><span className="text-sm">Loading…</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <BookOpen size={32} className="text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No custom classes yet</p>
            <p className="text-xs text-slate-400 text-center max-w-xs">
              Add your classes above or pick a template. Until you do, the student registration page shows default Nigerian school classes.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {classes.map((cls, i) => (
              <li key={cls.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] group transition-colors">
                <span className="text-slate-300 dark:text-slate-600 text-xs font-mono w-5 text-right shrink-0">{i + 1}</span>
                <BookOpen size={13} className="text-slate-400 shrink-0" />
                <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">{cls.name}</span>
                <button
                  onClick={() => deleteClass(cls)}
                  disabled={deletingId === cls.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 disabled:opacity-50"
                  title={`Remove ${cls.name}`}
                >
                  {deletingId === cls.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />
                  }
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}