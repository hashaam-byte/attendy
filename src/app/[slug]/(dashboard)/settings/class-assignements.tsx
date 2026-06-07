// src/app/[slug]/(dashboard)/settings/class-assignments.tsx — ATTENDY-EDU v4
// Admin assigns teachers to one or more classes.
// Drop this component into the admin SettingsClient.

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, X, Loader2, CheckCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type StaffMember = {
  id:         string;   // org_users.id
  user_id:    string;
  role:       string;
  is_active:  boolean;
  email:      string | null;
  assignments: string[];  // class_name[]
};

interface Props {
  staff:   StaffMember[];
  classes: string[];
  orgId:   string;
}

export function ClassAssignmentPanel({ staff, classes, orgId }: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const [localStaff, setLocalStaff] = useState<StaffMember[]>(staff);
  const [loading,    setLoading]    = useState<string | null>(null);  // org_user_id
  const [expanded,   setExpanded]   = useState<string | null>(null);

  const teachers = localStaff.filter((s) => s.role === "teacher" && s.is_active);

  async function assign(orgUserId: string, className: string) {
    setLoading(`${orgUserId}-${className}`);
    const { data: org } = await supabase
      .from("class_assignments")
      .select("id")
      .eq("org_user_id", orgUserId)
      .eq("class_name", className)
      .single();

    if (org) {
      // Already assigned — remove
      await supabase.from("class_assignments").delete()
        .eq("org_user_id", orgUserId)
        .eq("class_name", className);

      setLocalStaff((prev) => prev.map((s) =>
        s.id === orgUserId
          ? { ...s, assignments: s.assignments.filter((c) => c !== className) }
          : s
      ));
    } else {
      // Assign
      await supabase.from("class_assignments").insert({
        organisation_id: orgId,
        org_user_id:     orgUserId,
        class_name:      className,
        is_form_teacher: false,
      });

      setLocalStaff((prev) => prev.map((s) =>
        s.id === orgUserId
          ? { ...s, assignments: [...s.assignments, className] }
          : s
      ));
    }

    setLoading(null);
    router.refresh();
  }

  if (teachers.length === 0) {
    return (
      <div className="card p-6 text-center">
        <Users size={28} className="mx-auto text-green-200 dark:text-green-800 mb-2" />
        <p className="text-sm text-slate-400 dark:text-[#4a7a5a]">
          No active teachers found. Add teacher accounts above first.
        </p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="card p-6 text-center">
        <BookOpen size={28} className="mx-auto text-green-200 dark:text-green-800 mb-2" />
        <p className="text-sm text-slate-400 dark:text-[#4a7a5a]">
          No classes found. Register students and assign them to classes first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {teachers.map((teacher) => {
        const isExpanded = expanded === teacher.id;
        const assignedCount = teacher.assignments.length;

        return (
          <div
            key={teacher.id}
            className={cn(
              "card overflow-hidden transition-all",
              isExpanded && "border-green-400 dark:border-green-700"
            )}
          >
            {/* Header row */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-green-50/50 dark:hover:bg-green-950/10 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : teacher.id)}
            >
              <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-xs font-bold text-sky-700 dark:text-sky-400 shrink-0">
                {(teacher.email ?? "T")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {teacher.email ?? `Teacher ${teacher.id.slice(0, 8)}`}
                </p>
                <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">
                  {assignedCount === 0
                    ? "No classes assigned"
                    : `${assignedCount} class${assignedCount > 1 ? "es" : ""}: ${teacher.assignments.join(", ")}`
                  }
                </p>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                {isExpanded ? "▲ collapse" : "▼ assign"}
              </span>
            </button>

            {/* Class picker */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-[#bbf7d0] dark:border-[#1a3a24]">
                <p className="text-xs text-slate-500 dark:text-[#6b9e7a] mb-3">
                  Tap a class to assign or remove. Teacher can only see students in assigned classes.
                </p>
                <div className="flex flex-wrap gap-2">
                  {classes.map((cls) => {
                    const isAssigned = teacher.assignments.includes(cls);
                    const key = `${teacher.id}-${cls}`;
                    const isLoading = loading === key;

                    return (
                      <button
                        key={cls}
                        onClick={() => assign(teacher.id, cls)}
                        disabled={!!loading}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                          isAssigned
                            ? "bg-green-600 border-green-600 text-white hover:bg-red-500 hover:border-red-500"
                            : "border-[#bbf7d0] dark:border-[#1a3a24] text-slate-500 hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-400"
                        )}
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