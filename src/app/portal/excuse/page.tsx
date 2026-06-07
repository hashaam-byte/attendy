"use client";
// src/app/portal/excuse/page.tsx — ATTENDY-EDU v4
// Parent submits an excuse/permission slip for their child.
// Accessed from portal/dashboard via a "Submit Excuse" button.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, FileCheck, Loader2, CheckCircle,
  AlertCircle, Calendar,
} from "lucide-react";
import Link from "next/link";

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
    const stored = sessionStorage.getItem("parent_students");
    if (!stored) { router.push("/portal"); return; }
    try {
      const parsed: Student[] = JSON.parse(stored);
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
      setError("Failed to submit. Please try again.");
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#030a05" }}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-900/30 border border-green-700/40 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={36} className="text-green-400" />
          </div>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: "white", marginBottom: 8 }}>
            Request submitted
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24, lineHeight: 1.6 }}>
            Your excuse request has been sent to the school. You will receive an SMS if it is approved.
          </p>
          <button
            onClick={() => router.push("/portal/dashboard")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 24px", borderRadius: 12,
              background: "#16a34a", color: "white",
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
    <div className="min-h-screen" style={{ background: "#030a05", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* Nav */}
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => router.push("/portal/dashboard")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "monospace" }}
        >
          ← Back to dashboard
        </button>
      </div>

      <div style={{ maxWidth: 440, margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <FileCheck size={24} color="#4ade80" />
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 4 }}>
            Submit Excuse
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            Request an excused absence for your child
          </p>
        </div>

        {/* Form */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, overflow: "hidden" }}>
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.5), transparent)" }} />
          <form onSubmit={handleSubmit} style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Student selector */}
            {students.length > 1 && (
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, fontFamily: "monospace" }}>
                  Child
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.88)", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id} style={{ background: "#050f07" }}>
                      {s.full_name} {s.class_name ? `— ${s.class_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date range */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, fontFamily: "monospace" }}>
                  From
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value, end_date: e.target.value }))}
                  required
                  style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.88)", fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, fontFamily: "monospace" }}>
                  To
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  min={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  required
                  style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.88)", fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, fontFamily: "monospace" }}>
                Reason *
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                required
                rows={4}
                placeholder="e.g. My child has a medical appointment and will be absent…"
                style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.88)", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "none", boxSizing: "border-box" }}
              />
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6, fontFamily: "monospace" }}>
                This will be reviewed by the school admin
              </p>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#fca5a5", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !form.reason.trim()}
              style={{
                padding: "14px",
                borderRadius: 12,
                background: (loading || !form.reason.trim()) ? "rgba(255,255,255,0.05)" : "#16a34a",
                color: (loading || !form.reason.trim()) ? "rgba(255,255,255,0.25)" : "white",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 700,
                border: "none", cursor: (loading || !form.reason.trim()) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
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