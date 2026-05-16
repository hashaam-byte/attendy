"use client";
// src/app/[slug]/(dashboard)/students/register/page.tsx — ATTENDY-EDU v3
// Auto-generates student ID: first letter of first word + first letter of last word
// of school name + 4-digit zero-padded count + 2 random digits.
// Example: Greenfield Academy → GA-0042-7f

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, UserPlus, RefreshCw, Info } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const CLASSES = [
  "Nursery 1","Nursery 2","Nursery 3",
  "Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6",
  "JSS 1","JSS 2","JSS 3",
  "SSS 1","SSS 2","SSS 3",
];

// ── ID generator ──────────────────────────────────────────────
// prefix  = first letter of first word + first letter of last word (uppercased)
// count   = zero-padded total student count + 1
// suffix  = 2 random hex chars for uniqueness
function generateStudentId(schoolName: string, studentCount: number): string {
  const words = schoolName.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0]?.toUpperCase() ?? "X";
  const last  = words.length > 1 ? words[words.length - 1][0].toUpperCase() : first;
  const prefix = `${first}${last}`;
  const seq    = String(studentCount + 1).padStart(4, "0");
  const rand   = Math.floor(Math.random() * 100).toString().padStart(2, "0");
  return `${prefix}-${seq}-${rand}`;
}

export default function RegisterStudentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    full_name:    "",
    class_name:   "",
    parent_phone: "",
    employee_id:  "",
    notes:        "",
  });

  const [orgId,       setOrgId]       = useState<string | null>(null);
  const [orgName,     setOrgName]     = useState<string>("");
  const [studentCount, setStudentCount] = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [limitError,  setLimitError]  = useState<string | null>(null);

  // Fetch org info + current student count on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${slug}/login`); return; }

      const { data: orgUser } = await supabase
        .from("org_users")
        .select("organisation_id")
        .eq("user_id", user.id)
        .single();

      if (!orgUser) { router.push(`/${slug}/login`); return; }

      const [{ data: org }, { count }] = await Promise.all([
        supabase
          .from("organisations")
          .select("id, name, max_members, is_active, plan")
          .eq("id", orgUser.organisation_id)
          .single(),
        supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("organisation_id", orgUser.organisation_id)
          .eq("member_type", "student")
          .eq("is_active", true),
      ]);

      if (!org) { router.push(`/${slug}/login`); return; }

      setOrgId(org.id);
      setOrgName(org.name);
      setStudentCount(count ?? 0);

      // Pre-fill auto ID
      setForm((f) => ({
        ...f,
        employee_id: generateStudentId(org.name, count ?? 0),
      }));

      setLoadingMeta(false);
    })();
  }, []);

  function regenerateId() {
    setForm((f) => ({
      ...f,
      employee_id: generateStudentId(orgName, studentCount),
    }));
  }

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setError(null);
    setLimitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.class_name || !form.parent_phone.trim()) {
      setError("Full name, class, and parent phone are required.");
      return;
    }
    if (!orgId) return;
    setLoading(true);
    setError(null);

    // Re-check limit at submit time
    const { data: org } = await supabase
      .from("organisations")
      .select("max_members, is_active")
      .eq("id", orgId)
      .single();

    if (!org?.is_active) {
      setError("Your school account is suspended. Contact Attendy support.");
      setLoading(false);
      return;
    }

    const { count: currentCount } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("member_type", "student")
      .eq("is_active", true);

    const limit = org?.max_members ?? 30;
    if ((currentCount ?? 0) >= limit) {
      setLimitError(`You've reached your plan limit of ${limit} students. Contact Attendy to upgrade.`);
      setLoading(false);
      return;
    }

    // Ensure employee_id is not empty — generate one if user cleared it
    const finalId = form.employee_id.trim() || generateStudentId(orgName, currentCount ?? studentCount);

    const { data: member, error: insertError } = await supabase
      .from("members")
      .insert({
        organisation_id: orgId,
        full_name:        form.full_name.trim(),
        class_name:       form.class_name,
        parent_phone:     form.parent_phone.trim(),
        member_type:      "student",
        role:             "viewer",
        employee_id:      finalId,
        notes:            form.notes.trim() || null,
        is_active:        true,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Fire-and-forget registration SMS
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "registration", member_id: member.id, org_id: orgId }),
    }).catch(() => {});

    router.push(`/${slug}/qr-cards?id=${member.id}`);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${slug}/students`} className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="page-title">Register Student</h2>
          <p className="page-sub">QR card generated automatically · SMS sent to parent</p>
        </div>
      </div>

      {limitError && (
        <div className="card p-4 border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-950/20">
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">{limitError}</p>
          <p className="text-xs text-red-500 mt-1">
            Contact{" "}
            <a href="https://wa.me/2348077291745" className="underline">Attendy on WhatsApp</a>{" "}
            to upgrade your plan.
          </p>
        </div>
      )}

      <div className="card p-6">
        {loadingMeta ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <Loader2 size={20} className="animate-spin text-green-500" />
            <span className="text-sm text-slate-400 dark:text-[#4a7a5a]">Loading school info…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                className="input-base"
                placeholder="e.g. Adaeze Okonkwo"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                required
              />
            </div>

            {/* Class */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                className="input-base"
                value={form.class_name}
                onChange={(e) => update("class_name", e.target.value)}
                required
              >
                <option value="">Select class…</option>
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Student ID — auto-generated, editable */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
                Student ID
              </label>
              <div className="flex gap-2">
                <input
                  className="input-base font-mono flex-1"
                  placeholder="Auto-generated"
                  value={form.employee_id}
                  onChange={(e) => update("employee_id", e.target.value)}
                />
                <button
                  type="button"
                  onClick={regenerateId}
                  title="Generate a new ID"
                  className="btn-secondary px-3 shrink-0"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <div className="flex items-start gap-1.5 mt-1.5">
                <Info size={11} className="text-slate-400 dark:text-[#4a7a5a] shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">
                  Auto-generated from your school name (<span className="font-mono">{orgName ? generateStudentId(orgName, studentCount) : "…"}</span>).
                  Edit freely or click <RefreshCw size={10} className="inline" /> for a new one. This appears on the QR card.
                </p>
              </div>
            </div>

            {/* Parent phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
                Parent / Guardian Phone <span className="text-red-500">*</span>
              </label>
              <input
                className="input-base"
                placeholder="08012345678"
                type="tel"
                value={form.parent_phone}
                onChange={(e) => update("parent_phone", e.target.value)}
                required
              />
              <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-1">
                Parent receives SMS on arrival, late arrival, and absence alerts.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
                Notes <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                className="input-base resize-none"
                rows={2}
                placeholder="Any special notes about this student…"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link href={`/${slug}/students`} className="btn-secondary flex-1 justify-center">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !form.full_name || !form.class_name || !form.parent_phone}
                className="btn-primary flex-1 justify-center"
              >
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Registering…</>
                  : <><UserPlus size={15} /> Register &amp; Print QR</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}