"use client";
// src/components/ui/login-transition.tsx — ATTENDY-EDU v3
// Diagonal split-reveal transition that fires after successful login.
// Usage: wrap your page content with <LoginTransition> and call the
// exported `triggerLoginTransition()` function after auth succeeds.

import { useEffect, useRef, useState, useCallback } from "react";
import { CheckCircle } from "lucide-react";

interface LoginTransitionProps {
  children: React.ReactNode;
}

// Global trigger — call this after supabase.auth.signInWithPassword succeeds,
// right before router.push(). The animation completes in ~900ms so the push
// should be delayed by that amount.
let _trigger: (() => void) | null = null;

export function triggerLoginTransition(): Promise<void> {
  return new Promise((resolve) => {
    if (!_trigger) { resolve(); return; }
    _trigger();
    setTimeout(resolve, 880);
  });
}

export function LoginTransition({ children }: LoginTransitionProps) {
  const [phase, setPhase] = useState<"idle" | "flash" | "split" | "done">("idle");
  const resolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    _trigger = () => {
      setPhase("flash");
      // Flash the button green for 220ms, then split
      setTimeout(() => setPhase("split"), 220);
      // After panels are gone, mark done
      setTimeout(() => setPhase("done"), 900);
    };
    return () => { _trigger = null; };
  }, []);

  if (phase === "done") return null;

  return (
    <>
      {/* The overlay panels sit on top of everything */}
      {(phase === "flash" || phase === "split") && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          {/* ── TOP panel (clips from bottom along diagonal) ── */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--panel-bg, #0c1a12)",
              clipPath: "polygon(0 0, 100% 0, 100% 57%, 0 45%)",
              transform: phase === "split" ? "translateY(-105%)" : "translateY(0)",
              transition:
                phase === "split"
                  ? "transform 0.72s cubic-bezier(0.76, 0, 0.24, 1)"
                  : "none",
              willChange: "transform",
            }}
          />

          {/* ── BOTTOM panel (clips from top along same diagonal) ── */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--panel-bg-2, #0a1a0f)",
              clipPath: "polygon(0 45%, 100% 57%, 100% 100%, 0 100%)",
              transform: phase === "split" ? "translateY(105%)" : "translateY(0)",
              transition:
                phase === "split"
                  ? "transform 0.72s cubic-bezier(0.76, 0, 0.24, 1)"
                  : "none",
              willChange: "transform",
            }}
          />

          {/* ── Success tick that fades with the panels ── */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              opacity: phase === "split" ? 0 : 1,
              transition: "opacity 0.18s ease",
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 8px rgba(22,163,74,0.18)",
                animation: "tickPop 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
              }}
            >
              <CheckCircle size={26} color="white" strokeWidth={2.5} />
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "0.05em",
              }}
            >
              Signed in
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tickPop {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        :root {
          --panel-bg:   #0c1a12;
          --panel-bg-2: #0a1a0f;
        }
      `}</style>

      {children}
    </>
  );
}