"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const CLASSES = [
  "Nursery 1", "Nursery 2", "Nursery 3",
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3",
  "SSS 1", "SSS 2", "SSS 3",
];

export default function RegisterStudentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    full_name: "",
    class_name: "",
    parent_phone: "",
    parent_phone_2: "",
    employee_id: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.class_name || !form.parent_phone.trim()) {
      setError("Full name, class, and parent phone are required.");
      return;
    }

    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: orgUser } = await supabase
      .from("org_users")
      .select("organisation_id")
      .eq("user_id", user.id)
      .single();

    if (!orgUser) { router.push("/login"); return; }
    const orgId = orgUser.organisation_id;

    // Check subscription limit
    const { data: org } = await supabase
      .from("organisations")
      .select("max_members, plan, is_active")
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
      .eq("is_active", true)
      .eq("member_type", "student");

    if ((currentCount ?? 0) >= (org?.max_members ?? 30)) {
      setLimitError(
        `You have reached your plan limit of ${org?.max_members} students. Upgrade your plan to add more.`
      );
      setLoading(false);
      return;
    }

    // Insert member
    const { data: member, error: insertError } = await supabase
      .from("members")
      .insert({
        organisation_id: orgId,
        full_name: form.full_name.trim(),
        class_name: form.class_name,
        parent_phone: form.parent_phone.trim(),
        member_type: "student",
        role: "viewer",
        employee_id: form.employee_id.trim() || null,
        notes: form.notes.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Send registration SMS
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "registration",
          member_id: member.id,
          org_id: orgId,
        }),
      });
    } catch {
      // Non-blocking
    }

    router.push(`/students/${member.id}/qr`);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/students" className="btn-ghost p-2">
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
            Contact <a href="mailto:support@attendy.ng" className="underline">support@attendy.ng</a> to upgrade.
          </p>
        </div>
      )}

      <div className="card p-6">
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
              {CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Student ID */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
              Student ID <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              className="input-base"
              placeholder="e.g. STU-2024-001"
              value={form.employee_id}
              onChange={(e) => update("employee_id", e.target.value)}
            />
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
              Parent receives SMS on arrival, absence, and registration.
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
            <Link href="/students" className="btn-secondary flex-1 justify-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !form.full_name || !form.class_name || !form.parent_phone}
              className="btn-primary flex-1 justify-center"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Registering…</>
              ) : (
                <><UserPlus size={15} /> Register & Generate QR</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}