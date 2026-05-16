"use client";
// src/components/ui/hero-entrance.tsx — ATTENDY-EDU v3
// Drop this component into landing-page.tsx to replace the static hero copy.
// It handles: staggered fade-up entrance, looping typing animation across
// 3 phrases, and a pulsing "live" badge.
//
// USAGE in landing-page.tsx:
//   1. Import: import { HeroEntrance } from "@/components/ui/hero-entrance";
//   2. Replace the static <div> block (badge + h1 + p + buttons) with:
//      <HeroEntrance primaryColor="#16a34a" slug={slug} />

import { useEffect, useRef, useState } from "react";
import { MessageCircle, ArrowRight, CheckCircle } from "lucide-react";

// ── Typing phrases — each one tells a different part of the product story ──
const PHRASES = [
  { text: "Attendance in one scan.",         pause: 1800 },
  { text: "Parent notified in seconds.",     pause: 1800 },
  { text: "Attendy — school made simple.",   pause: 3200 },
];

const TRUST_BULLETS = [
  "Free first month",
  "No hardware needed",
  "Works on ₦30k Android",
  "Setup in 2 hours",
];

interface Props {
  primaryColor?: string;
  onStaffLogin?: () => void;
}

export function HeroEntrance({ primaryColor = "#16a34a", onStaffLogin }: Props) {
  const [phase, setPhase] = useState<"waiting" | "running">("waiting");
  const h1Ref  = useRef<HTMLHeadingElement>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Stagger entrance ────────────────────────────────────────────
  // Each child has a data-delay attribute (ms). On mount we apply
  // a one-shot CSS class that triggers the animation.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // ── Typing engine ───────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    // Wait for the h1 stagger delay (about 400ms) before starting
    const startDelay = setTimeout(() => {
      setPhase("running");
    }, 480);
    return () => clearTimeout(startDelay);
  }, [visible]);

  useEffect(() => {
    if (phase !== "running" || !h1Ref.current) return;
    let phraseIdx = 0;
    let charIdx   = 0;
    let direction: "typing" | "pausing" | "erasing" = "typing";
    let rafId: number;

    const el = h1Ref.current;
    let lastTime = 0;

    function getDelay() {
      if (direction === "typing")  return 44;
      if (direction === "pausing") return PHRASES[phraseIdx].pause;
      // erasing — faster on longer strings
      return 22;
    }

    function tick(now: number) {
      if (now - lastTime < getDelay()) { rafId = requestAnimationFrame(tick); return; }
      lastTime = now;

      const phrase = PHRASES[phraseIdx].text;

      if (direction === "typing") {
        charIdx++;
        el.innerHTML =
          phrase.slice(0, charIdx) +
          '<span class="hero-cursor" aria-hidden="true"></span>';
        if (charIdx >= phrase.length) {
          // Full phrase typed — pause before erasing
          direction = "pausing";
        }
      } else if (direction === "pausing") {
        direction = "erasing";
      } else {
        // erasing
        charIdx--;
        el.innerHTML =
          phrase.slice(0, charIdx) +
          '<span class="hero-cursor" aria-hidden="true"></span>';
        if (charIdx <= 0) {
          phraseIdx = (phraseIdx + 1) % PHRASES.length;
          direction = "typing";
          // Brief blank pause between phrases
          lastTime = now + 220;
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  // ── Stagger helper ──────────────────────────────────────────────
  function stagger(delayMs: number, extra?: React.CSSProperties): React.CSSProperties {
    return {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delayMs}ms, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delayMs}ms`,
      ...extra,
    };
  }

  return (
    <>
      <style>{`
        .hero-cursor {
          display: inline-block;
          width: 3px;
          height: 0.85em;
          background: #4ade80;
          vertical-align: middle;
          margin-left: 3px;
          border-radius: 1px;
          animation: heroBlink 0.75s step-end infinite;
        }
        @keyframes heroBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .hero-live-dot {
          animation: heroLivePing 1.8s ease-in-out infinite;
        }
        @keyframes heroLivePing {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50%       { transform: scale(1.5); opacity: 0; }
        }
        @keyframes heroCountUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Live scan counter badge ── */}
      <div style={stagger(0)}>
        <HeroScanCounter primaryColor={primaryColor} visible={visible} />
      </div>

      {/* ── Product tag ── */}
      <div style={{ ...stagger(120), marginTop: "1.5rem", marginBottom: "1.25rem" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(34,197,94,0.10)",
            border: "1px solid rgba(34,197,94,0.22)",
            borderRadius: 100,
            padding: "4px 14px",
            fontSize: 11,
            fontWeight: 700,
            color: "#4ade80",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#4ade80", display: "inline-block",
            }}
            className="hero-live-dot"
          />
          Built for Nigerian Schools · QR Attendance
        </span>
      </div>

      {/* ── Typing headline ── */}
      <h1
        ref={h1Ref}
        style={{
          ...stagger(200),
          fontSize: "clamp(2rem, 5vw, 3.4rem)",
          fontWeight: 800,
          color: "white",
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          minHeight: "4.2rem",        // prevent layout shift during typing
          marginBottom: "1.25rem",
        }}
        aria-live="polite"
        aria-label="Animated headline — Attendy school attendance management"
      >
        {/* Populated by typing engine */}
      </h1>

      {/* ── Sub-copy ── */}
      <p
        style={{
          ...stagger(340),
          fontSize: 15,
          color: "rgba(255,255,255,0.45)",
          lineHeight: 1.65,
          maxWidth: 420,
          marginBottom: "2rem",
        }}
      >
        Students tap their QR card at the gate. The system logs it, marks
        them on time or late, and texts the parent — all before they reach
        their classroom. No paper. No calls. No guessing.
      </p>

      {/* ── CTA buttons ── */}
      <div
        style={{
          ...stagger(460),
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: "2rem",
        }}
      >
        <a
          href="https://wa.me/2348077291745?text=Hi%2C%20I%20want%20to%20set%20up%20Attendy%20for%20my%20school"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 22px",
            borderRadius: 14,
            background: primaryColor,
            color: "white",
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
            boxShadow: `0 6px 28px ${primaryColor}45`,
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 36px ${primaryColor}55`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 28px ${primaryColor}45`;
          }}
        >
          <MessageCircle size={17} />
          Start Free Trial on WhatsApp
        </a>

        <button
          onClick={onStaffLogin}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 22px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.65)",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
          }}
        >
          Staff Login <ArrowRight size={14} />
        </button>
      </div>

      {/* ── Trust bullets ── */}
      <div
        style={{
          ...stagger(560),
          display: "flex",
          flexWrap: "wrap",
          gap: "16px 20px",
        }}
      >
        {TRUST_BULLETS.map((text) => (
          <span
            key={text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "rgba(255,255,255,0.28)",
            }}
          >
            <CheckCircle size={11} style={{ color: "#16a34a", flexShrink: 0 }} />
            {text}
          </span>
        ))}
      </div>
    </>
  );
}

// ── Live scan counter sub-component ────────────────────────────────
function HeroScanCounter({ primaryColor, visible }: { primaryColor: string; visible: boolean }) {
  const [display, setDisplay] = useState(0);
  const [target, setTarget]   = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    fetch("/api/scan-count")
      .then((r) => r.json())
      .then((d) => setTarget(d.count ?? 1247))
      .catch(() => setTarget(1247));
  }, []);

  useEffect(() => {
    if (!visible || target === 0) return;
    const start = performance.now();
    const duration = 1800;

    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(target * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, target]);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(22,163,74,0.10)",
        border: "1px solid rgba(22,163,74,0.20)",
        borderRadius: 100,
        padding: "6px 14px",
        fontSize: 13,
        color: "rgba(255,255,255,0.55)",
        opacity: visible ? 1 : 0,
        animation: visible ? "heroCountUp 0.5s ease forwards" : "none",
      }}
    >
      <span style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
        <span
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "#4ade80", opacity: 0.75,
          }}
          className="hero-live-dot"
        />
        <span
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "#22c55e",
          }}
        />
      </span>
      <span style={{ fontWeight: 700, color: "#4ade80" }}>
        {display.toLocaleString("en-NG")}
      </span>
      scans logged across Nigeria
    </span>
  );
}