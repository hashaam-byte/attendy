"use client";
// src/app/portal/page.tsx — ATTENDY-EDU v3
// Dark bioluminescent aesthetic matching the staff login page.
// Parent login by phone. Staff login via slug modal.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2, Phone, ArrowRight, X, Search, GraduationCap,
  Shield, Smartphone, ChevronRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// ── Animated grid background (same DNA as login page) ─────────
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% -5%, rgba(34,197,94,0.14) 0%, transparent 55%),
                       radial-gradient(ellipse 50% 35% at 85% 100%, rgba(34,197,94,0.08) 0%, transparent 50%),
                       linear-gradient(160deg, #030a05 0%, #05100a 40%, #040c07 100%)`,
        }}
      />
      {/* Scan line */}
      <div
        className="absolute left-0 right-0 h-px opacity-20"
        style={{
          background: `linear-gradient(90deg, transparent 0%, #22c55e 50%, transparent 100%)`,
          animation: "portalScan 5s ease-in-out infinite",
          top: "50%",
        }}
      />
      {/* Grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="pgrid" width="52" height="52" patternUnits="userSpaceOnUse">
            <path d="M 52 0 L 0 0 0 52" fill="none" stroke="#22c55e" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pgrid)" />
      </svg>
      {/* Glow orbs */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: 480, height: 480,
          top: "-15%", left: "-8%",
          background: "#16a34a",
          opacity: 0.07,
          animation: "portalPulse 9s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: 360, height: 360,
          bottom: "-12%", right: "-8%",
          background: "#15803d",
          opacity: 0.06,
          animation: "portalPulse 11s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}

// ── Floating info chips ─────────────────────────────────────────
function FloatingChips() {
  const chips = [
    { text: "INSTANT SMS ALERTS", sub: "ARRIVAL", side: "left" as const, top: "22%" },
    { text: "NO APP NEEDED", sub: "PHONE ONLY", side: "right" as const, top: "38%" },
  ];
  return (
    <>
      {chips.map(({ text, sub, side, top }, i) => (
        <div
          key={i}
          className="absolute hidden xl:block select-none"
          style={{
            [side]: "4%", top,
            animation: `portalFloat ${3.5 + i * 0.8}s ease-in-out infinite`,
            animationDelay: `${i * 1.2}s`,
          }}
        >
          <div
            style={{
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.18)",
              backdropFilter: "blur(8px)",
              borderRadius: 10,
              padding: "8px 14px",
            }}
          >
            <p style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(34,197,94,0.5)", fontFamily: "monospace", marginBottom: 2 }}>{sub}</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(34,197,94,0.75)", letterSpacing: "0.06em", fontFamily: "monospace" }}>{text}</p>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Glass phone input ────────────────────────────────────────────
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
      style={{
        background: focused ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${focused ? "rgba(34,197,94,0.45)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 14,
        boxShadow: focused ? "0 0 0 3px rgba(34,197,94,0.12), 0 0 20px rgba(34,197,94,0.08)" : "none",
        transition: "all 0.25s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          color: focused ? "#4ade80" : "rgba(255,255,255,0.22)",
          transition: "color 0.2s ease",
        }}
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
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          padding: "14px 16px 14px 42px",
          color: "rgba(255,255,255,0.88)",
          fontSize: 14,
          fontFamily: "'DM Mono', 'Courier New', monospace",
          letterSpacing: "0.04em",
        }}
      />
      {/* Bottom accent sweep */}
      <div
        style={{
          position: "absolute",
          bottom: 0, left: 0,
          height: 1,
          width: focused ? "100%" : "0%",
          background: "linear-gradient(90deg, transparent, #4ade80, transparent)",
          transition: "width 0.35s ease",
        }}
      />
    </div>
  );
}

// ── Staff slug modal ─────────────────────────────────────────────
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
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 380,
          background: "#050f07",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: "2rem",
          animation: "portalSlideUp 0.3s cubic-bezier(0.22,1,0.36,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent */}
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.5), transparent)", marginBottom: "1.5rem" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <GraduationCap size={13} color="white" />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.92)", fontFamily: "'DM Sans', sans-serif" }}>Staff Login</span>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>Enter your school ID to continue</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", marginBottom: 8, fontFamily: "monospace" }}>
            School ID
          </label>
          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.22)", pointerEvents: "none" }}
            />
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setError(null); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="e.g. greenfield-academy"
              autoComplete="off"
              style={{
                width: "100%",
                background: focused ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${focused ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 12,
                padding: "12px 14px 12px 34px",
                color: "rgba(255,255,255,0.88)",
                fontSize: 13,
                fontFamily: "'DM Mono', monospace",
                outline: "none",
                transition: "all 0.2s ease",
              }}
            />
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginTop: 6, fontFamily: "monospace" }}>Provided by your school admin</p>

          {error && (
            <div style={{
              marginTop: 10, padding: "10px 14px", borderRadius: 10,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
              fontSize: 12, color: "#fca5a5", fontFamily: "monospace",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={checking || !slug.trim()}
            style={{
              width: "100%", marginTop: 14,
              padding: "12px",
              borderRadius: 12,
              background: (checking || !slug.trim()) ? "rgba(255,255,255,0.05)" : "#16a34a",
              border: "none",
              color: (checking || !slug.trim()) ? "rgba(255,255,255,0.2)" : "white",
              fontSize: 13, fontWeight: 700,
              cursor: (checking || !slug.trim()) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s ease",
            }}
          >
            {checking ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Checking…</> : <>Continue to Login <ArrowRight size={13} /></>}
          </button>
        </form>

        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)", margin: "1.25rem 0" }} />
        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
          Parent?{" "}
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#4ade80", fontSize: 11, fontFamily: "monospace" }}>
            Use the parent portal →
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Main portal page ─────────────────────────────────────────────
export default function ParentPortalPage() {
  const router = useRouter();
  const supabase = createClient();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  function s(delay: number): React.CSSProperties {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(18px)",
      transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    };
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Rate limit: max 5 attempts per 60 seconds
    const now = Date.now();
    const WINDOW = 60_000;
    const MAX = 5;
    let attempts: number[] = [];
    try { attempts = JSON.parse(sessionStorage.getItem("portal_attempts") ?? "[]"); } catch { attempts = []; }
    attempts = attempts.filter((t) => now - t < WINDOW);
    if (attempts.length >= MAX) {
      const wait = Math.ceil((WINDOW - (now - Math.min(...attempts))) / 1000);
      setError(`Too many attempts. Please wait ${wait}s and try again.`);
      return;
    }
    attempts.push(now);
    sessionStorage.setItem("portal_attempts", JSON.stringify(attempts));

    setLoading(true);

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Enter a valid Nigerian phone number");
      setLoading(false);
      return;
    }

    const variants = [cleaned];
    if (cleaned.startsWith("0") && cleaned.length === 11) variants.push("234" + cleaned.slice(1));
    if (cleaned.startsWith("234")) variants.push("0" + cleaned.slice(3));

    const { data: students } = await supabase
      .from("members")
      .select("id, full_name, class_name, organisation_id, parent_phone")
      .in("parent_phone", variants)
      .eq("member_type", "student")
      .eq("is_active", true);

    if (!students || students.length === 0) {
      setError("No students found for this number. Check with your school admin.");
      setLoading(false);
      return;
    }

    // Store with a 30-minute TTL — prevents shared devices from leaking
    // one parent's data to the next person who opens the browser.
    sessionStorage.setItem("parent_session", JSON.stringify({
      students,
      phone,
      expiresAt: Date.now() + 30 * 60 * 1000,
    }));
    router.push("/portal/dashboard");
  }

  const canSubmit = phone.length >= 10 && !loading;

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

        @keyframes portalScan {
          0%   { top: -2px; opacity: 0; }
          5%   { opacity: 0.2; }
          95%  { opacity: 0.2; }
          100% { top: calc(100% + 2px); opacity: 0; }
        }
        @keyframes portalPulse {
          0%,100% { transform: scale(1);    opacity: 0.07; }
          50%      { transform: scale(1.06); opacity: 0.12; }
        }
        @keyframes portalFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-7px); }
        }
        @keyframes portalSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes portalRing {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes portalPing {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        input::placeholder { color: rgba(255,255,255,0.18) !important; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px transparent inset !important;
          -webkit-text-fill-color: rgba(255,255,255,0.88) !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        .portal-crt {
          position: fixed; inset: 0; z-index: 30; pointer-events: none;
          background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.025) 0px, rgba(0,0,0,0.025) 1px, transparent 1px, transparent 2px);
          background-size: 100% 2px;
        }
      `}</style>

      {/* Background */}
      <GridBackground />

      {/* CRT overlay */}
      <div className="portal-crt" />

      {/* Floating chips */}
      <FloatingChips />

      {/* Top nav */}
      <nav
        style={{
          position: "relative", zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.5rem",
          ...s(0),
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            textDecoration: "none",
            color: "rgba(255,255,255,0.3)",
            fontSize: 12, fontFamily: "monospace", letterSpacing: "0.1em",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >
          ← ATTENDY.EDU
        </Link>
        <button
          onClick={() => setShowStaffModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.22)",
            borderRadius: 100,
            padding: "5px 14px",
            color: "#4ade80",
            fontSize: 11, fontWeight: 700,
            fontFamily: "monospace", letterSpacing: "0.1em",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.14)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.08)"; }}
        >
          STAFF LOGIN →
        </button>
      </nav>

      {/* Center content */}
      <div
        style={{
          position: "relative", zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "calc(100vh - 64px)",
          padding: "2rem 1rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Logo mark */}
          <div style={{ ...s(60), display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem" }}>
            <div style={{ position: "relative", width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
              {/* Orbit ring */}
              <svg
                width="88" height="88"
                style={{ position: "absolute", inset: 0, animation: "portalRing 10s linear infinite" }}
              >
                <circle cx="44" cy="44" r="40" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="6 8" opacity="0.35" />
              </svg>
              {/* Inner glow ring */}
              <div style={{
                position: "absolute", inset: 10,
                borderRadius: "50%",
                border: "1px solid rgba(34,197,94,0.25)",
                boxShadow: "0 0 18px rgba(34,197,94,0.12), inset 0 0 18px rgba(34,197,94,0.06)",
              }} />
              {/* Icon */}
              <div style={{
                width: 52, height: 52,
                borderRadius: 16,
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 28px rgba(34,197,94,0.18)",
              }}>
                <Smartphone size={22} color="#4ade80" />
              </div>
              {/* Corner dots */}
              {[[-2,-2],[86,-2],[-2,86],[86,86]].map(([x,y],i) => (
                <div key={i} style={{
                  position: "absolute", width: 5, height: 5, borderRadius: "50%",
                  background: "#22c55e", opacity: 0.5,
                  left: x, top: y,
                  boxShadow: "0 0 5px #22c55e",
                }} />
              ))}
            </div>

            <h1 style={{ fontSize: 19, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.01em", marginBottom: 4, textAlign: "center" }}>
              Parent Portal
            </h1>
            <p style={{ fontSize: 12, color: "#4ade80", letterSpacing: "0.14em", opacity: 0.75, fontFamily: "monospace", textTransform: "uppercase", textAlign: "center" }}>
              Child Attendance Viewer
            </p>
          </div>

          {/* Card */}
          <div
            style={{
              ...s(180),
              background: "rgba(255,255,255,0.025)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow: "0 40px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {/* Top accent line */}
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.55), transparent)" }} />

            <div style={{ padding: "1.75rem" }}>
              {/* Card header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <div>
                  <p style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.14em", color: "rgba(255,255,255,0.22)", textTransform: "uppercase", marginBottom: 4 }}>
                    Phone Verification
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>
                    View your child's attendance
                  </p>
                </div>
                <div style={{
                  width: 34, height: 34, borderRadius: 12,
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Shield size={15} color="#4ade80" />
                </div>
              </div>

              <form onSubmit={handleLogin} style={{ ...s(280) }}>
                <label style={{
                  display: "block",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                  color: "rgba(255,255,255,0.28)", textTransform: "uppercase",
                  marginBottom: 8, fontFamily: "monospace",
                }}>
                  Your phone number
                </label>

                <PhoneInput
                  value={phone}
                  onChange={(v) => { setPhone(v); setError(null); }}
                  focused={focused}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />

                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6, fontFamily: "monospace" }}>
                  As registered by your school admin
                </p>

                {error && (
                  <div style={{
                    marginTop: 10, padding: "10px 14px", borderRadius: 12,
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
                    fontSize: 12, color: "#fca5a5", fontFamily: "monospace",
                    display: "flex", alignItems: "flex-start", gap: 8,
                    animation: "portalSlideUp 0.3s ease",
                  }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    width: "100%", marginTop: 14,
                    padding: "14px",
                    borderRadius: 14,
                    background: canSubmit
                      ? "linear-gradient(135deg, #16a34a, #15803d)"
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${canSubmit ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.06)"}`,
                    color: canSubmit ? "white" : "rgba(255,255,255,0.2)",
                    fontSize: 14, fontWeight: 700,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    fontFamily: "'DM Sans', sans-serif",
                    boxShadow: canSubmit ? "0 8px 28px rgba(22,163,74,0.28)" : "none",
                    transition: "all 0.2s ease",
                    letterSpacing: "0.02em",
                  }}
                  onMouseEnter={(e) => { if (canSubmit) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                >
                  {loading
                    ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Searching…</>
                    : <>View My Child's Attendance <ChevronRight size={15} /></>}
                </button>
              </form>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "1.25rem 0" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.14)", fontFamily: "monospace", letterSpacing: "0.1em" }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>

              {/* Staff CTA */}
              <button
                onClick={() => setShowStaffModal(true)}
                style={{
                  width: "100%", padding: "11px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 12, fontWeight: 600,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s ease",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.06)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,197,94,0.2)";
                  (e.currentTarget as HTMLElement).style.color = "#4ade80";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
                }}
              >
                <GraduationCap size={13} />
                Staff / Teacher Login →
              </button>
            </div>

            {/* Footer strip */}
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)" }} />
            <div style={{ padding: "10px 18px", background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              {[
                { icon: "🔒", text: "No account needed" },
                { icon: "📱", text: "Phone number only" },
                { icon: "⚡", text: "Instant access" },
              ].map(({ icon, text }) => (
                <span key={text} style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 }}>
                  {icon} {text}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p style={{
            ...s(400),
            textAlign: "center",
            fontSize: 10,
            marginTop: "1.5rem",
            color: "rgba(255,255,255,0.12)",
            fontFamily: "monospace",
            letterSpacing: "0.08em",
          }}>
            ATTENDY · BUILT FOR NIGERIAN SCHOOLS · 🇳🇬
          </p>
        </div>
      </div>

      {/* Staff modal */}
      {showStaffModal && <StaffModal onClose={() => setShowStaffModal(false)} />}
    </div>
  );
}