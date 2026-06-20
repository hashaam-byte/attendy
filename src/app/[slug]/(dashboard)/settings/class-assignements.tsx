// src/app/[slug]/(dashboard)/settings/class-assignments.tsx — ATTENDY-EDU v5
// FIXED: .single() threw/returned an error object (not null) when no
// assignment row existed yet, so the "already assigned?" check was
// unreliable. Switched to .maybeSingle(). Also surfaces Supabase errors
// directly to the admin instead of failing silently, and is theme-safe.

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, X, Loader2, CheckCircle, Users, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type StaffMember = {
  id:         string;   // org_users.id
  user_id:    string;
  role:       string;
  is_active:  boolean;
  email:      string | null;
  assignments?: string[];  // class_name[]
};

interface Props {
  staff:   StaffMember[];
  classes: string[];
  orgId:   string;
}

export function ClassAssignmentPanel({ staff, classes, orgId }: Props) {
  const supabase = createClient();
  const router   = useRouter();

  // Ensure local staff items always have an assignments array to avoid
  // repeated undefined checks elsewhere.
  const [localStaff, setLocalStaff] = useState<StaffMember[]>(
    staff.map((s) => ({ ...s, assignments: s.assignments ?? [] }))
  );
  const [loading,    setLoading]    = useState<string | null>(null);  // `${orgUserId}-${className}`
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const teachers = localStaff.filter((s) => s.role === "teacher" && s.is_active);

  async function assign(orgUserId: string, className: string) {
    const key = `${orgUserId}-${className}`;
    setLoading(key);
    setError(null);

    // FIXED: .single() errors when zero rows match — use .maybeSingle()
    // so `existing` is reliably null (not assigned) or a row (assigned).
    const { data: existing, error: lookupErr } = await supabase
      .from("class_assignments")
      .select("id")
      .eq("org_user_id", orgUserId)
      .eq("organisation_id", orgId)
      .eq("class_name", className)
      .maybeSingle();

    if (lookupErr) {
      setError(`Could not check existing assignment: ${lookupErr.message}`);
      setLoading(null);
      return;
    }

    if (existing) {
      // Already assigned — remove
      const { error: delErr } = await supabase
        .from("class_assignments")
        .delete()
        .eq("id", existing.id);

      if (delErr) {
        setError(`Failed to unassign: ${delErr.message}`);
        setLoading(null);
        return;
      }

      setLocalStaff((prev) => prev.map((s) =>
        s.id === orgUserId
          ? { ...s, assignments: (s.assignments ?? []).filter((c) => c !== className) }
          : s
      ));
    } else {
      // Assign
      const { error: insErr } = await supabase.from("class_assignments").insert({
        organisation_id: orgId,
        org_user_id:     orgUserId,
        class_name:      className,
        is_form_teacher: false,
      });

      if (insErr) {
        // Most common cause: RLS policy blocks admin INSERT on
        // class_assignments, or a unique constraint collision.
        setError(
          insErr.message.toLowerCase().includes("row-level security") ||
          insErr.message.toLowerCase().includes("policy")
            ? "Permission denied by database security policy. Ask your developer to allow admins to insert into class_assignments (RLS)."
            : `Failed to assign: ${insErr.message}`
        );
        setLoading(null);
        return;
      }

      setLocalStaff((prev) => prev.map((s) =>
        s.id === orgUserId
          ? { ...s, assignments: [...(s.assignments ?? []), className] }
          : s
      ));
    }

    setLoading(null);
    router.refresh();
  }

  if (teachers.length === 0) {
    return (
      <div className="card p-6 text-center">
        <Users size={28} className="mx-auto mb-2" style={{ color: "var(--accent-bg-strong)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No active teachers found. Add teacher accounts above first.
        </p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="card p-6 text-center">
        <BookOpen size={28} className="mx-auto mb-2" style={{ color: "var(--accent-bg-strong)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No classes found. Register students and assign them to classes first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg text-sm" style={{ background: "var(--status-danger-bg)", color: "var(--status-danger)" }}>
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {teachers.map((teacher) => {
        const isExpanded = expanded === teacher.id;
        const assignedCount = teacher.assignments?.length ?? 0;

        return (
          <div
            key={teacher.id}
            className={cn("card overflow-hidden transition-all")}
            style={isExpanded ? { borderColor: "var(--accent)" } : {}}
          >
            {/* Header row */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              onClick={() => setExpanded(isExpanded ? null : teacher.id)}
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--accent-bg)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--status-info-bg)", color: "var(--status-info)" }}>
                {(teacher.email ?? "T")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {teacher.email ?? `Teacher ${teacher.id.slice(0, 8)}`}
                </p>
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                  {assignedCount === 0
                    ? "No classes assigned"
                    : `${assignedCount} class${assignedCount > 1 ? "es" : ""}: ${(teacher.assignments ?? []).join(", ")}`
                  }
                </p>
              </div>
              <span className="text-[10px] shrink-0" style={{ color: "var(--text-faint)" }}>
                {isExpanded ? "▲ collapse" : "▼ assign"}
              </span>
            </button>

            {/* Class picker */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  Tap a class to assign or remove. Teacher can only see students in assigned classes.
                </p>
                <div className="flex flex-wrap gap-2">
                  {classes.map((cls) => {
                    const isAssigned = (teacher.assignments ?? []).includes(cls);
                    const key = `${teacher.id}-${cls}`;
                    const isLoading = loading === key;

                    return (
                      <button
                        key={cls}
                        onClick={() => assign(teacher.id, cls)}
                        disabled={!!loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                        style={isAssigned ? {
                          background: "var(--accent)", borderColor: "var(--accent)", color: "white",
                        } : {
                          borderColor: "var(--border)", color: "var(--text-muted)",
                        }}
                      >
                        {isLoading ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : isAssigned ? (
                          <CheckCircle size={11} />
                        ) : (
                          <Plus size={11} />
                        )}
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
