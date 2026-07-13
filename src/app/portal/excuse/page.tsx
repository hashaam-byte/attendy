"use client";
// src/app/portal/excuse/page.tsx — ATTENDY-EDU v5
// Theme-aware (light/dark via CSS variables). Parent submits an
// excuse/permission slip for their child.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  FileCheck, Loader2, CheckCircle,
  AlertCircle, Sun, Moon,
} from "lucide-react";
import { useTheme } from "next-themes";

type Student = {
  id:              string;
  full_name:       string;
  class_name:      string | null;
  organisation_id: string;
  parent_phone:    string | null;
};

export default function ExcuseSubmissionPage() {
  const router   = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const [students,   setStudents]   = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({
    start_date: new Date().toISOString().split("T")[0],
    end_date:   new Date().toISOString().split("T")[0],
    reason:     "",
  });
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    // Read the TTL-aware session key (set by portal/page.tsx after our fix).
    // Fall back to the legacy "parent_students" key for users who logged in
    // before the deploy so they don't get kicked out mid-session.
    const newStored    = sessionStorage.getItem("parent_session");
    const legacyStored = sessionStorage.getItem("parent_students");

    if (!newStored && !legacyStored) { router.push("/portal"); return; }

    try {
      let parsed: Student[] = [];

      if (newStored) {
        const session = JSON.parse(newStored) as { students: Student[]; expiresAt: number };
        if (!session.students?.length || Date.now() > session.expiresAt) {
          sessionStorage.removeItem("parent_session");
          router.push("/portal");
          return;
        }
        parsed = session.students;
      } else if (legacyStored) {
        parsed = JSON.parse(legacyStored);
      }

      if (!parsed.length) { router.push("/portal"); return; }
      setStudents(parsed);
      setSelectedId(parsed[0].id);
    } catch {
      router.push("/portal");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    setError(null);

    const selected = students.find((s) => s.id === selectedId);
    if (!selected) { setLoading(false); return; }

    const { error: insertError } = await supabase
      .from("excuse_requests")
      .insert({
        organisation_id: selected.organisation_id,
        member_id:       selectedId,
        submitted_by:    selected.parent_phone ?? "Parent",
        start_date:      form.start_date,
        end_date:        form.end_date,
        reason:          form.reason.trim(),
        status:          "pending",
      });

    if (insertError) {
      console.error("[excuse submission]", insertError.message);
      setError(
        insertError.message.toLowerCase().includes("row-level security") ||
        insertError.message.toLowerCase().includes("policy")
          ? "Submission blocked by school's security settings. Please contact the school office directly, or ask your admin to check excuse_requests RLS policies."
          : "Failed to submit. Please try again."
      );
    } else {
      // Push admins to let them know a new excuse came in — fire and forget
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type:   "excuse_request",
          org_id: selected.organisation_id,
          title:  "New Excuse Request",
          body:   `${selected.full_name}'s parent submitted an excuse request for review.`,
          target: "admins",
        }),
      }).catch(() => {});
      setSubmitted(true);
    }
    setLoading(false);
  }

  const ThemeBtn = (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      style={{ width: 32, height: 32, borderRadius: 9, background: "var(--bg-subtle)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--icon-default)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
    </button>
  );

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-base)" }}>
        <div className="text-center max-w-sm">
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--status-success-bg)", border: "1px solid var(--status-success)40", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle size={36} style={{ color: "var(--status-success)" }} />
          </div>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Request submitted
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>
            Your excuse request has been sent to the school. You will receive an SMS if it is approved.
          </p>
          <button
            onClick={() => router.push("/portal/dashboard")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 24px", borderRadius: 12,
              background: "var(--accent)", color: "white",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)", fontFamily: "'DM Sans', system-ui, sans-serif", color: "var(--text-primary)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* Nav */}
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => router.push("/portal/dashboard")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}
        >
          ← Back to dashboard
        </button>
        {ThemeBtn}
      </div>

      <div style={{ maxWidth: 440, margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent-bg)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <FileCheck size={24} style={{ color: "var(--accent)" }} />
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Submit Excuse
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Request an excused absence for your child
          </p>
        </div>

        {/* Form */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ height: 2, background: `linear-gradient(90deg, transparent, var(--accent), transparent)` }} />
          <form onSubmit={handleSubmit} style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Student selector */}
            {students.length > 1 && (
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
                  Child
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="input-base"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} {s.class_name ? `— ${s.class_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date range */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
                  From
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value, end_date: e.target.value }))}
                  required
                  className="input-base"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
                  To
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  min={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  required
                  className="input-base"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
                Reason *
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                required
                rows={4}
                placeholder="e.g. My child has a medical appointment and will be absent…"
                className="input-base resize-none"
              />
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
                This will be reviewed by the school admin
              </p>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--status-danger-bg)", border: "1px solid var(--status-danger)40", fontSize: 12, color: "var(--status-danger)", display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.5 }}>
                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !form.reason.trim()}
              className="btn-primary"
              style={{ padding: "14px", fontSize: 14, justifyContent: "center" }}
            >
              {loading
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Submitting…</>
                : <><FileCheck size={15} /> Submit Excuse Request</>
              }
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}