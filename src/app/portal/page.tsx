"use client";
// src/app/portal/page.tsx — ATTENDY-EDU
// Same dark-glass family as the staff login page, calmer version:
// one soft background glow, one typeface, no scanlines/grid/floating chips.
// Parent login by phone. Staff login via slug modal. Same functionality.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Phone, ArrowRight, X, Search, GraduationCap,
  Shield, ChevronRight, UserRound,
} from "lucide-react";
import Link from "next/link";

// ── Background: one soft gradient, matches the staff login page ───
function Background() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, #16a34a14 0%, transparent 60%),
                       linear-gradient(160deg, #0a0f0c 0%, #0d1310 45%, #0a0f0c 100%)`,
        }}
      />
      <div
        className="absolute rounded-full blur-3xl opacity-[0.08]"
        style={{ width: 420, height: 420, bottom: "-12%", right: "-8%", background: "#16a34a" }}
      />
    </div>
  );
}

// ── Phone input ─────────────────────────────────────────────────
function PhoneInput({
  value, onChange, focused, onFocus, onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}) {
  return (
    <div
      className="relative rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: focused ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${focused ? "rgba(34,197,94,0.45)" : "rgba(255,255,255,0.08)"}`,
        boxShadow: focused ? "0 0 0 3px rgba(34,197,94,0.12)" : "none",
      }}
    >
      <div
        className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
        style={{ color: focused ? "#4ade80" : "rgba(255,255,255,0.3)" }}
      >
        <Phone size={15} />
      </div>
      <input
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="08012345678"
        required
        className="w-full bg-transparent text-[15px] outline-none"
        style={{ padding: "12.5px 16px 12.5px 42px", color: "rgba(255,255,255,0.92)" }}
      />
    </div>
  );
}

// ── Child's full name input ──────────────────────────────────────
function NameInput({
  value, onChange, focused, onFocus, onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}) {
  return (
    <div
      className="relative rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: focused ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${focused ? "rgba(34,197,94,0.45)" : "rgba(255,255,255,0.08)"}`,
        boxShadow: focused ? "0 0 0 3px rgba(34,197,94,0.12)" : "none",
      }}
    >
      <div
        className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
        style={{ color: focused ? "#4ade80" : "rgba(255,255,255,0.3)" }}
      >
        <UserRound size={15} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="e.g. Chidinma Okafor"
        autoComplete="off"
        required
        className="w-full bg-transparent text-[15px] outline-none"
        style={{ padding: "12.5px 16px 12.5px 42px", color: "rgba(255,255,255,0.92)" }}
      />
    </div>
  );
}

// ── Staff slug modal ────────────────────────────────────────────
function StaffModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase();
    if (!s) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`/api/check-org?slug=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (!res.ok || !data.exists) { setError("School not found. Check your school ID with your admin."); setChecking(false); return; }
      if (data.suspended) { setError("This school is currently suspended."); setChecking(false); return; }
      if (data.expired) { setError("This school's subscription has expired."); setChecking(false); return; }
      router.push(`/${s}/login`);
    } catch {
      setError("Something went wrong. Please try again.");
      setChecking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[380px] rounded-2xl p-7"
        style={{
          background: "#0d1310",
          border: "1px solid rgba(255,255,255,0.08)",
          animation: "portalSlideUp 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#16a34a" }}>
                <GraduationCap size={13} color="white" />
              </div>
              <span className="text-[15px] font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>Staff Login</span>
            </div>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>Enter your school ID to continue</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
            School ID
          </label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setError(null); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="e.g. greenfield-academy"
              autoComplete="off"
              className="w-full rounded-xl text-[13px] outline-none transition-all"
              style={{
                background: focused ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${focused ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.08)"}`,
                padding: "11px 14px 11px 32px",
                color: "rgba(255,255,255,0.9)",
              }}
            />
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>Provided by your school admin</p>

          {error && (
            <div
              className="mt-2.5 px-3.5 py-2.5 rounded-xl text-[13px]"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(248,113,113,0.9)" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={checking || !slug.trim()}
            className="w-full mt-3.5 py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{
              background: (checking || !slug.trim()) ? "rgba(255,255,255,0.06)" : "#16a34a",
              color: (checking || !slug.trim()) ? "rgba(255,255,255,0.25)" : "white",
              cursor: (checking || !slug.trim()) ? "not-allowed" : "pointer",
            }}
          >
            {checking ? <><Loader2 size={14} className="animate-spin" /> Checking</> : <>Continue to login <ArrowRight size={14} /></>}
          </button>
        </form>

        <div className="h-px my-4" style={{ background: "rgba(255,255,255,0.07)" }} />
        <p className="text-center text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          Parent?{" "}
          <button onClick={onClose} className="font-medium" style={{ color: "#4ade80" }}>
            Use the parent portal →
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Main portal page ────────────────────────────────────────────
export default function ParentPortalPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);

  // Client-side rate limit — a first line of defense so people don't
  // hammer the button; the real limit lives server-side in /api/portal.
  function clientRateLimited(): number | null {
    const now = Date.now();
    const WINDOW = 60_000;
    const MAX = 5;
    let attempts: number[] = [];
    try { attempts = JSON.parse(sessionStorage.getItem("portal_attempts") ?? "[]"); } catch { attempts = []; }
    attempts = attempts.filter((t) => now - t < WINDOW);
    if (attempts.length >= MAX) {
      return Math.ceil((WINDOW - (now - Math.min(...attempts))) / 1000);
    }
    attempts.push(now);
    sessionStorage.setItem("portal_attempts", JSON.stringify(attempts));
    return null;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Enter a valid Nigerian phone number");
      return;
    }
    if (childName.trim().split(/\s+/).filter(Boolean).length < 2) {
      setError("Enter your child's full name (first and last name)");
      return;
    }

    const wait = clientRateLimited();
    if (wait) {
      setError(`Too many attempts. Please wait ${wait}s and try again.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/portal/verify-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, childName }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Display-only data for the UI's student switcher. All real
      // attendance/org reads go through cookie-authenticated API routes
      // from here on — see /api/portal/attendance.
      sessionStorage.setItem("parent_session", JSON.stringify({
        students: data.students,
        phone: cleaned,
        expiresAt: Date.now() + 30 * 60 * 1000,
      }));
      router.push("/portal/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const canSubmit = phone.length >= 10 && childName.trim().length >= 3 && !loading;

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes portalSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .card-appear   { animation: portalSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .card-appear-1 { animation-delay: 0.05s; }
        .card-appear-2 { animation-delay: 0.1s; }

        input::placeholder { color: rgba(255,255,255,0.22) !important; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px transparent inset !important;
          -webkit-text-fill-color: rgba(255,255,255,0.9) !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <Background />

      {/* Top nav */}
      <div className="relative z-20 flex items-center justify-between px-6 py-5" style={{ animation: "fadeIn 0.4s ease both" }}>
        <Link href="/" className="text-sm font-medium transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
          ← Attendy
        </Link>
        <button
          onClick={() => setShowStaffModal(true)}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" }}
        >
          Staff login <ChevronRight size={13} />
        </button>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">

          {/* Logo + heading */}
          <div className="card-appear card-appear-1 flex flex-col items-center mb-7">
            <div
              className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.25)",
                boxShadow: "0 8px 24px rgba(34,197,94,0.15)",
              }}
            >
              <Shield size={24} color="#4ade80" />
            </div>
            <h1 className="font-semibold text-lg" style={{ color: "rgba(255,255,255,0.95)" }}>
              Parent Portal
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              View your child's attendance
            </p>
          </div>

          {/* Card */}
          <div
            className="card-appear card-appear-2 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.035)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div className="p-7">
              <form onSubmit={handleLogin}>
                <label htmlFor="phone" className="block text-[13px] font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Your phone number
                </label>
                <PhoneInput
                  value={phone}
                  onChange={(v) => { setPhone(v); setError(null); }}
                  focused={phoneFocused}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                />
                <p className="text-xs mt-1.5 mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                  As registered by your school admin
                </p>

                <label htmlFor="childName" className="block text-[13px] font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Your child's full name
                </label>
                <NameInput
                  value={childName}
                  onChange={(v) => { setChildName(v); setError(null); }}
                  focused={nameFocused}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                />
                <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  First and last name, exactly as registered
                </p>

                {error && (
                  <div
                    className="flex items-start gap-2.5 p-3 rounded-xl text-[13px] mt-3"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "rgba(248,113,113,0.9)",
                      animation: "portalSlideUp 0.3s ease",
                    }}
                  >
                    <span className="shrink-0 mt-0.5">⚠</span>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 mt-4"
                  style={{
                    background: canSubmit ? "#16a34a" : "rgba(255,255,255,0.06)",
                    color: canSubmit ? "white" : "rgba(255,255,255,0.25)",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Checking
                      </>
                    ) : (
                      <>
                        View my child&apos;s attendance
                        <ChevronRight size={15} />
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
              </div>

              {/* Staff CTA */}
              <button
                onClick={() => setShowStaffModal(true)}
                className="w-full py-2.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-colors"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
              >
                <GraduationCap size={14} />
                Staff / Teacher login →
              </button>
            </div>

            {/* Footer strip */}
            <div
              className="px-7 py-3 flex items-center justify-center gap-3 border-t"
              style={{ background: "rgba(0,0,0,0.15)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              {["No account needed", "Free to log in", "Secure access"].map((text) => (
                <span key={text} className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {text}
                </span>
              ))}
            </div>
          </div>

          {/* Page footer */}
          <p
            className="card-appear text-center text-xs mt-6"
            style={{ color: "rgba(255,255,255,0.2)", animationDelay: "0.35s" }}
          >
            Attendy · Built for Nigerian schools
          </p>
        </div>
      </div>

      {showStaffModal && <StaffModal onClose={() => setShowStaffModal(false)} />}
    </div>
  );
}