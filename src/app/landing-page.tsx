"use client";
// src/app/landing-page.tsx — ATTENDY-EDU v4
// Complete redesign: typing hero, staggered entrance, scroll reveals,
// refined Nigerian-school aesthetic, improved sections throughout.

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, QrCode, Bell, BarChart3, Users, CheckCircle,
  ArrowRight, Smartphone, Zap, Search, Loader2,
  Wifi, MessageCircle, X, ChevronDown, ChevronUp, Shield, Clock,
  Download, Calculator,
} from "lucide-react";
import Image from "next/image";

// ─────────────────────────────────────────────────────────────
// 0.  TYPING ENGINE  (self-contained, no deps)
// ─────────────────────────────────────────────────────────────
const HERO_PHRASES = [
  { text: "Attendance in one scan.",        pauseMs: 2000 },
  { text: "Parent notified in seconds.",    pauseMs: 2000 },
  { text: "Attendy — school made simple.",  pauseMs: 3600 },
];

function useTypingAnimation(active: boolean) {
  const ref   = useRef<HTMLElement | null>(null);
  const rafId = useRef(0);

  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    let pi = 0, ci = 0;
    type Dir = "typing" | "pausing" | "erasing";
    let dir: Dir = "typing";
    let last = 0;

    function delay() {
      if (dir === "typing")  return 46;
      if (dir === "pausing") return HERO_PHRASES[pi].pauseMs;
      return 24;
    }

    function tick(now: number) {
      if (now - last < delay()) { rafId.current = requestAnimationFrame(tick); return; }
      last = now;
      const phrase = HERO_PHRASES[pi].text;

      if (dir === "typing") {
        ci++;
        el.innerHTML = phrase.slice(0, ci) + '<span class="atd-cursor"></span>';
        if (ci >= phrase.length) dir = "pausing";
      } else if (dir === "pausing") {
        dir = "erasing";
      } else {
        ci--;
        el.innerHTML = phrase.slice(0, ci) + '<span class="atd-cursor"></span>';
        if (ci <= 0) {
          pi = (pi + 1) % HERO_PHRASES.length;
          dir = "typing";
          last = now + 280;
        }
      }
      rafId.current = requestAnimationFrame(tick);
    }

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [active]);

  return ref;
}

// ─────────────────────────────────────────────────────────────
// 1.  SCROLL-REVEAL  (intersection observer)
// ─────────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return { ref, revealed };
}

// ─────────────────────────────────────────────────────────────
// 2.  LIVE SCAN COUNTER
// ─────────────────────────────────────────────────────────────
function ScanCounter() {
  const [display, setDisplay] = useState(0);
  const [target,  setTarget]  = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    fetch("/api/scan-count").then(r => r.json()).then(d => setTarget(d.count ?? 1247)).catch(() => setTarget(1247));
  }, []);

  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    const dur   = 1600;
    const tick  = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setDisplay(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return (
    <span className="atd-live-badge">
      <span className="atd-live-dot-wrap" aria-hidden="true">
        <span className="atd-live-dot-ping" />
        <span className="atd-live-dot-core" />
      </span>
      <span className="atd-live-num">{display.toLocaleString("en-NG")}</span>
      <span className="atd-live-label">scans logged across Nigeria</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// 3.  FAQ ACCORDION
// ─────────────────────────────────────────────────────────────
function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`atd-faq ${open ? "atd-faq--open" : ""}`}>
      <button className="atd-faq__btn" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <p className="atd-faq__body">{a}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4.  DATA
// ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: QrCode,     title: "QR Gate Scanning",   color: "#4ade80", bg: "rgba(34,197,94,0.08)",   desc: "Students scan in under 2 seconds. Works on any Android. Clear green or red result every time." },
  { icon: Bell,       title: "Instant Parent SMS",  color: "#38bdf8", bg: "rgba(56,189,248,0.08)",  desc: "Parent gets an SMS the moment their child arrives — or a missed-arrival alert at 9 AM." },
  { icon: Wifi,       title: "Works Offline",       color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  desc: "Internet down at the gate? Scans queue locally and sync on reconnect. Nothing lost." },
  { icon: BarChart3,  title: "Attendance Reports",  color: "#a78bfa", bg: "rgba(167,139,250,0.08)", desc: "Daily, weekly, term reports. Per-student % for exam eligibility. CSV export." },
  { icon: Smartphone, title: "QR Card Designer",    color: "#f472b6", bg: "rgba(244,114,182,0.08)", desc: "Design student ID cards with your school logo and colours. Print on cardstock." },
  { icon: Users,      title: "Multi-Role Access",   color: "#2dd4bf", bg: "rgba(45,212,191,0.08)",  desc: "Admin, Teacher, Gateman — each sees only what they need. Parent portal needs only a phone number." },
];

type PriceMap = Record<string, number>;
type LimitMap = Record<string, { members: number; sms: number }>;

// Builds the plan cards from live prices/limits (passed down from page.tsx,
// sourced from platform_settings via the admin panel). Falls back to the
// same numbers that used to be hardcoded here if a plan is missing.
function buildPlans(prices: PriceMap, limits: LimitMap) {
  const DEFAULTS: Record<string, { members: number; sms: number }> = {
    trial: { members: 30, sms: 100 },
    basic: { members: 100, sms: 500 },
    standard: { members: 300, sms: 2000 },
    premium: { members: 1000, sms: 10000 },
  };

  const formatPrice = (n: number) => (n === 0 ? "Free" : `₦${n.toLocaleString("en-NG")}`);

  return [
    { key: "trial",    name: "Trial",    period: "30 days",   highlight: false, badge: null,           cta: "Start free" },
    { key: "basic",    name: "Basic",    period: "per month", highlight: false, badge: null,           cta: "Get started" },
    { key: "standard", name: "Standard", period: "per month", highlight: true,  badge: "Most popular", cta: "Get started" },
    { key: "premium",  name: "Premium",  period: "per month", highlight: false, badge: null,           cta: "Get started" },
  ].map((plan) => ({
    ...plan,
    price: formatPrice(prices[plan.key] ?? 0),
    members: limits[plan.key]?.members ?? DEFAULTS[plan.key].members,
    sms: limits[plan.key]?.sms ?? DEFAULTS[plan.key].sms,
  }));
}

// ─────────────────────────────────────────────────────────────
// 3b. PRICING CALCULATOR
// ─────────────────────────────────────────────────────────────
function PriceCalculator({ prices, limits }: { prices: PriceMap; limits: LimitMap }) {
  const [students, setStudents] = useState(50);
  const plans = buildPlans(prices, limits);

  const recommended =
    plans.find((p) => p.members >= students) ?? plans[plans.length - 1];
  const smsEstimate = students * 22;
  const smsWarning = smsEstimate > recommended.sms && recommended.sms < 99999;
  const recPriceNum = prices[recommended.key] ?? 0;
  const perStudent = recPriceNum > 0 ? Math.round(recPriceNum / students) : 0;

  return (
    <div className="atd-calc">
      <div className="atd-calc-head">
        <div className="atd-calc-icon">
          <Calculator size={17} color="#4ade80" />
        </div>
        <div>
          <div className="atd-calc-title">Pricing calculator</div>
          <div className="atd-calc-sub">See what Attendy costs for your school</div>
        </div>
      </div>

      <div className="atd-calc-row">
        <span className="atd-calc-label">Number of students</span>
        <input
          type="number"
          min={1}
          max={5000}
          value={students}
          onChange={(e) => {
            const v = Math.max(1, Math.min(5000, parseInt(e.target.value) || 1));
            setStudents(v);
          }}
          className="atd-calc-input"
        />
      </div>
      <input
        type="range"
        min={1}
        max={2000}
        step={10}
        value={Math.min(students, 2000)}
        onChange={(e) => setStudents(parseInt(e.target.value))}
        className="atd-calc-slider"
      />
      <div className="atd-calc-ticks">
        <span>1</span><span>500</span><span>1000</span><span>1500</span><span>2000+</span>
      </div>

      <div className="atd-calc-result">
        <div className="atd-calc-result-top">
          <div>
            <div className="atd-calc-rec-tag">
              <Zap size={11} /> Recommended
            </div>
            <div className="atd-calc-rec-name">{recommended.name} Plan</div>
            <div className="atd-calc-rec-detail">
              Up to {recommended.members >= 99999 ? "unlimited" : recommended.members.toLocaleString()} students
              {" · "}
              {recommended.sms >= 99999 ? "unlimited" : recommended.sms.toLocaleString()} SMS/month
            </div>
          </div>
          <div>
            <div className="atd-calc-rec-price">{recommended.price}</div>
            {recPriceNum > 0 && <div className="atd-calc-rec-period">per month</div>}
          </div>
        </div>

        {recPriceNum > 0 && (
          <div className="atd-calc-stats">
            <div>
              <div className="atd-calc-stat-label">Per student</div>
              <div className="atd-calc-stat-val">₦{perStudent.toLocaleString()}/mo</div>
            </div>
            <div>
              <div className="atd-calc-stat-label">Annual cost</div>
              <div className="atd-calc-stat-val">₦{(recPriceNum * 12).toLocaleString()}/yr</div>
            </div>
            <div>
              <div className="atd-calc-stat-label">Est. SMS needed</div>
              <div className="atd-calc-stat-val">~{smsEstimate.toLocaleString()}/mo</div>
            </div>
          </div>
        )}

        {smsWarning && (
          <div className="atd-calc-warning">
            ⚠ Estimated SMS usage (~{smsEstimate.toLocaleString()}/mo) exceeds this plan&apos;s {recommended.sms.toLocaleString()} SMS limit.
            Consider {plans[plans.indexOf(recommended) + 1]?.name ?? "a higher plan"} or ask us about a custom SMS bundle.
          </div>
        )}
      </div>

      <div className="atd-calc-strip">
        {plans.map((plan) => {
          const isRec = plan.key === recommended.key;
          const fits = plan.members >= students;
          return (
            <div
              key={plan.key}
              className="atd-calc-chip"
              style={{
                background: isRec ? "rgba(34,197,94,0.1)" : "transparent",
                borderColor: isRec ? "#16a34a" : "rgba(255,255,255,0.07)",
                opacity: fits ? 1 : 0.35,
              }}
            >
              <div className="atd-calc-chip-name">{plan.name}</div>
              <div className="atd-calc-chip-price">{plan.price}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FAQS = [
  { q: "Do students need a smartphone?",        a: "No. Students only need their printed QR card — a laminated card or sticker is fine. Only the gateman's phone needs to run the scanner." },
  { q: "What if the internet goes down?",        a: "The scanner works fully offline. It caches the student list on load. Scans queue locally and sync the moment you reconnect. Nothing is lost." },
  { q: "How do parents get notified?",           a: "Parents receive an SMS the moment their child's QR card is scanned. If the child hasn't arrived by a configurable time, an absence alert fires automatically." },
  { q: "How long does setup take?",              a: "For most schools: 1–2 hours. Sign up, we activate your account same day, bulk-import students via CSV, print QR cards, and the gateman is scanning by next morning." },
  { q: "Is our data secure?",                    a: "Data is stored in Supabase (SOC 2 Type II compliant). Row-Level Security is enforced — each school only ever sees its own data." },
  { q: "What happens when we hit an SMS limit?", a: "SMS overage is blocked, not billed. You'll never get a surprise charge. The dashboard shows your remaining count in real time." },
];

const SOCIAL_PROOF = [
  { icon: GraduationCap, text: <><strong>14+ schools</strong> onboarded</> },
  { icon: Users,         text: <><strong>1,200+</strong> students enrolled</> },
  { icon: Clock,         text: <>Average setup: <strong>under 2 hours</strong></> },
  { icon: Shield,        text: <><strong>₦0</strong> hardware needed</> },
];

// ─────────────────────────────────────────────────────────────
// 5.  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
interface LandingPageProps {
  prices: PriceMap;
  limits: LimitMap;
}

export default function LandingPage({ prices, limits }: LandingPageProps) {
  const router = useRouter();
  const apkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL;
  const PLANS = buildPlans(prices, limits);

  // Hero entrance
  const [heroIn,   setHeroIn]   = useState(false);
  const [typingOn, setTypingOn] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setHeroIn(true),   80);
    const t2 = setTimeout(() => setTypingOn(true), 520);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const h1Ref = useTypingAnimation(typingOn) as React.MutableRefObject<HTMLHeadingElement>;

  // Modal
  const [slug,      setSlug]      = useState("");
  const [checking,  setChecking]  = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Scroll reveals
  const howRev      = useReveal();
  const featuresRev = useReveal();
  const pricingRev  = useReveal();
  const faqRev      = useReveal();
  const ctaRev      = useReveal();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase();
    if (!s) return;
    setChecking(true); setSlugError(null);
    try {
      const res  = await fetch(`/api/check-org?slug=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (!res.ok || !data.exists) { setSlugError("School not found. Check your school ID with your admin."); setChecking(false); return; }
      if (data.suspended)          { setSlugError("This school is currently suspended.");                     setChecking(false); return; }
      if (data.expired)            { setSlugError("This school's subscription has expired.");                 setChecking(false); return; }
      router.push(`/${s}/login`);
    } catch { setSlugError("Something went wrong. Please try again."); setChecking(false); }
  }

  // Stagger helper
  function s(delayMs: number): React.CSSProperties {
    return {
      opacity:    heroIn ? 1 : 0,
      transform:  heroIn ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1) ${delayMs}ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delayMs}ms`,
    };
  }

  return (
    <div className="atd-root">

      {/* ── Global styles ───────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=DM+Sans:wght@400;500&display=swap');

        .atd-root {
          min-height: 100vh;
          background: #030b05;
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          overflow-x: hidden;
        }

        /* Subtle animated noise grain overlay */
        .atd-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.022;
          pointer-events: none;
          z-index: 0;
        }

        .atd-root > * { position: relative; z-index: 1; }

        /* Typography */
        .atd-display {
          font-family: 'Bricolage Grotesque', system-ui, sans-serif;
          font-weight: 800;
        }
        .atd-heading {
          font-family: 'Bricolage Grotesque', system-ui, sans-serif;
          font-weight: 600;
        }

        /* Cursor */
        .atd-cursor {
          display: inline-block;
          width: 3px;
          height: 0.82em;
          background: #4ade80;
          vertical-align: middle;
          margin-left: 3px;
          border-radius: 2px;
          animation: atdBlink 0.8s step-end infinite;
        }
        @keyframes atdBlink { 0%,100%{opacity:1} 50%{opacity:0} }

        /* Live badge */
        .atd-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(22,163,74,0.10);
          border: 1px solid rgba(22,163,74,0.22);
          border-radius: 100px;
          padding: 6px 14px;
          font-size: 13px;
        }
        .atd-live-dot-wrap {
          position: relative;
          width: 8px; height: 8px; flex-shrink: 0;
        }
        .atd-live-dot-ping {
          position: absolute; inset: 0; border-radius: 50%;
          background: #4ade80; opacity: 0;
          animation: atdPing 2s ease-in-out infinite;
        }
        .atd-live-dot-core {
          position: absolute; inset: 1px; border-radius: 50%;
          background: #22c55e;
        }
        @keyframes atdPing {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .atd-live-num   { font-weight: 700; color: #4ade80; }
        .atd-live-label { color: rgba(255,255,255,0.4); }

        /* Nav */
        .atd-nav {
          position: sticky; top: 0; z-index: 50;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(3,11,5,0.85);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        .atd-nav-inner {
          max-width: 1120px; margin: 0 auto;
          padding: 0 2rem;
          height: 64px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .atd-nav-logo {
          display: flex; align-items: center; gap: 10px;
        }
        .atd-nav-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: #16a34a;
          display: flex; align-items: center; justify-content: center;
        }
        .atd-nav-wordmark {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-weight: 800; font-size: 17px; letter-spacing: -0.03em;
        }
        .atd-nav-pill {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: #4ade80;
          border: 1px solid rgba(34,197,94,0.3);
          border-radius: 100px; padding: 2px 8px;
          background: rgba(34,197,94,0.08);
        }
        .atd-nav-links {
          display: flex; align-items: center; gap: 28px;
          font-size: 13px; color: rgba(255,255,255,0.38);
        }
        .atd-nav-links a { text-decoration: none; transition: color 0.15s; }
        .atd-nav-links a:hover { color: #4ade80; }
        .atd-nav-btn {
          padding: 8px 18px; border-radius: 10px;
          background: #16a34a; color: #fff;
          font-size: 13px; font-weight: 600;
          border: none; cursor: pointer;
          transition: background 0.15s, transform 0.12s;
        }
        .atd-nav-btn:hover { background: #15803d; transform: translateY(-1px); }

        /* Hero */
        .atd-hero {
          position: relative;
          max-width: 1120px; margin: 0 auto;
          padding: 5rem 2rem 0;
        }
        .atd-hero-grid {
          display: grid;
          grid-template-columns: 1fr 1.08fr;
          gap: 4rem;
          align-items: center;
          padding-bottom: 5rem;
        }
        @media(max-width:900px){
          .atd-hero-grid { grid-template-columns: 1fr; }
          .atd-hero-img-col { display: none; }
        }
        .atd-hero-tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.07em; color: #4ade80;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: 100px; padding: 5px 14px;
          margin-bottom: 1.25rem;
        }
        .atd-h1 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(2.1rem,4.5vw,3.6rem);
          font-weight: 800;
          line-height: 1.07;
          letter-spacing: -0.025em;
          color: #fff;
          min-height: 4.6rem;
          margin-bottom: 1.25rem;
        }
        .atd-hero-sub {
          font-size: 15px;
          color: rgba(255,255,255,0.42);
          line-height: 1.7;
          max-width: 420px;
          margin-bottom: 2rem;
        }
        .atd-hero-btns {
          display: flex; flex-wrap: wrap; gap: 10px;
          margin-bottom: 2rem;
        }
        .atd-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 22px; border-radius: 14px;
          background: #16a34a; color: #fff;
          font-weight: 700; font-size: 15px;
          text-decoration: none; border: none; cursor: pointer;
          box-shadow: 0 6px 28px rgba(22,163,74,0.35);
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
          font-family: inherit;
        }
        .atd-btn-primary:hover {
          background: #15803d;
          transform: translateY(-2px);
          box-shadow: 0 10px 36px rgba(22,163,74,0.45);
        }
        .atd-btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 22px; border-radius: 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.6);
          font-weight: 600; font-size: 15px;
          cursor: pointer; transition: background 0.15s;
          font-family: inherit;
        }
        .atd-btn-ghost:hover { background: rgba(255,255,255,0.08); }
        .atd-trust-row {
          display: flex; flex-wrap: wrap; gap: 16px 20px;
        }
        .atd-trust-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: rgba(255,255,255,0.28);
        }

        /* Hero image column */
        .atd-hero-img-col {
          position: relative; height: 520px;
        }
        .atd-hero-img-frame {
          position: absolute; inset: 0;
          border-radius: 32px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.07);
          transform: rotate(0.8deg);
        }
        .atd-hero-img-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(3,11,5,0.6), transparent 55%);
        }
        .atd-chip {
          position: absolute;
          background: rgba(7,18,8,0.92);
          border: 1px solid rgba(34,197,94,0.25);
          backdrop-filter: blur(8px);
          border-radius: 18px;
          padding: 12px 16px;
        }
        .atd-chip-scan {
          bottom: -12px; left: -28px;
          transform: rotate(-1.5deg);
          min-width: 210px;
        }
        .atd-chip-stat {
          top: -12px; right: -16px;
          transform: rotate(2deg);
          text-align: center; min-width: 90px;
        }
        .atd-chip-scan-title {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 700; color: #4ade80;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 4px;
        }
        .atd-chip-scan-name { font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 2px; }
        .atd-chip-scan-sub  { font-size: 11px; color: #4ade80; }
        .atd-chip-stat-num  { font-size: 26px; font-weight: 800; color: #4ade80; line-height: 1; }
        .atd-chip-stat-lbl  { font-size: 10px; color: rgba(255,255,255,0.38); margin-top: 3px; }

        /* Before/after strip */
        .atd-ba-wrap {
          max-width: 1120px; margin: 0 auto; padding: 0 2rem 5rem;
        }
        .atd-ba-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
        }
        @media(max-width:640px){ .atd-ba-grid { grid-template-columns: 1fr; } }
        .atd-ba-col { padding: 2rem; }
        .atd-ba-col:first-child { border-right: 1px solid rgba(255,255,255,0.06); }
        .atd-ba-tag {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; margin-bottom: 1.2rem;
          display: flex; align-items: center; gap: 6px;
        }
        .atd-ba-row {
          display: flex; align-items: flex-start; gap: 10px;
          margin-bottom: 12px; font-size: 13px;
        }
        .atd-ba-row--bad  { color: rgba(255,255,255,0.35); }
        .atd-ba-row--good { color: rgba(255,255,255,0.75); }

        /* Social proof strip */
        .atd-proof-strip {
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(22,163,74,0.04);
          padding: 14px 0;
        }
        .atd-proof-inner {
          max-width: 1120px; margin: 0 auto; padding: 0 2rem;
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 20px 40px;
        }
        .atd-proof-item {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: rgba(255,255,255,0.32);
        }
        .atd-proof-item strong { color: rgba(255,255,255,0.7); }

        /* Section shell */
        .atd-section {
          max-width: 1120px; margin: 0 auto;
          padding: 6rem 2rem;
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1);
        }
        .atd-section.atd-revealed {
          opacity: 1; transform: translateY(0);
        }
        .atd-section-tag {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: #4ade80; margin-bottom: 12px;
        }
        .atd-section-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(1.8rem,3.5vw,2.6rem);
          font-weight: 800; letter-spacing: -0.02em;
          color: #fff; margin-bottom: 10px;
        }
        .atd-section-sub {
          font-size: 14px; color: rgba(255,255,255,0.38);
        }
        .atd-section-head { text-align: center; margin-bottom: 3.5rem; }

        /* Step layout */
        .atd-step {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem; align-items: center;
          margin-bottom: 5rem;
        }
        @media(max-width:768px){ .atd-step { grid-template-columns: 1fr; } }
        .atd-step-img {
          border-radius: 24px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.07);
          aspect-ratio: 4/3; position: relative;
        }
        .atd-step-num {
          width: 40px; height: 40px; border-radius: 12px;
          background: #16a34a; color: #fff;
          font-size: 14px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
        }
        .atd-step-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 22px; font-weight: 700;
          color: #fff; margin-bottom: 12px;
        }
        .atd-step-body {
          font-size: 15px; color: rgba(255,255,255,0.45);
          line-height: 1.7; margin-bottom: 18px;
        }
        .atd-pill-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .atd-pill {
          font-size: 12px; color: #4ade80;
          border: 1px solid rgba(34,197,94,0.22);
          background: rgba(34,197,94,0.06);
          border-radius: 100px; padding: 4px 12px;
        }

        /* Feature grid */
        .atd-feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
        }
        .atd-feature-card {
          padding: 22px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.015);
          transition: background 0.2s, transform 0.2s;
        }
        .atd-feature-card:hover {
          background: rgba(255,255,255,0.03);
          transform: translateY(-2px);
        }
        .atd-feature-icon {
          width: 42px; height: 42px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
        }
        .atd-feature-title {
          font-weight: 600; font-size: 15px; color: #fff; margin-bottom: 6px;
        }
        .atd-feature-desc {
          font-size: 13px; color: rgba(255,255,255,0.4); line-height: 1.6;
        }

        /* Testimonials */
        .atd-testi-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media(max-width:640px){ .atd-testi-grid { grid-template-columns: 1fr; } }
        .atd-testi-card {
          padding: 28px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.015);
          display: flex; flex-direction: column; gap: 18px;
        }
        .atd-stars { display: flex; gap: 2px; }
        .atd-star { color: #22c55e; font-size: 13px; }
        .atd-testi-body {
          font-size: 14px; color: rgba(255,255,255,0.55);
          line-height: 1.7; flex: 1; font-style: italic;
        }
        .atd-testi-footer { display: flex; align-items: center; gap: 12px; }
        .atd-testi-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .atd-testi-name { font-size: 14px; font-weight: 600; color: #fff; }
        .atd-testi-role { font-size: 12px; color: rgba(255,255,255,0.3); }

        /* Pricing */
        .atd-plan-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        .atd-plan {
          padding: 24px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
          position: relative;
          transition: transform 0.15s;
        }
        .atd-plan:hover { transform: translateY(-3px); }
        .atd-plan--highlight {
          border-color: rgba(34,197,94,0.45);
          background: rgba(22,163,74,0.08);
        }
        .atd-plan-badge {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em;
          background: #16a34a; color: #fff;
          padding: 3px 12px; border-radius: 100px;
          white-space: nowrap;
        }
        .atd-plan-name { font-weight: 700; color: #fff; margin-bottom: 6px; font-size: 15px; }
        .atd-plan-price {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 28px; font-weight: 800; color: #fff;
          letter-spacing: -0.03em; line-height: 1;
        }
        .atd-plan-period { font-size: 11px; color: rgba(255,255,255,0.3); margin-left: 4px; }
        .atd-plan-divider {
          border: none; border-top: 1px solid rgba(255,255,255,0.07);
          margin: 16px 0;
        }
        .atd-plan-row {
          display: flex; justify-content: space-between;
          font-size: 12px; margin-bottom: 8px;
        }
        .atd-plan-row-label { color: rgba(255,255,255,0.38); }
        .atd-plan-row-val   { color: #fff; font-weight: 600; font-family: monospace; }
        .atd-plan-cta {
          display: block; text-align: center; text-decoration: none;
          padding: 10px; border-radius: 12px;
          font-size: 13px; font-weight: 600;
          margin-top: 18px;
          transition: all 0.15s;
        }
        .atd-plan-cta--highlight {
          background: #16a34a; color: #fff;
        }
        .atd-plan-cta--highlight:hover { background: #15803d; }
        .atd-plan-cta--default {
          border: 1px solid rgba(255,255,255,0.1);
          color: #4ade80;
        }
        .atd-plan-cta--default:hover {
          background: rgba(34,197,94,0.08);
          border-color: rgba(34,197,94,0.3);
        }

        /* Pricing calculator */
        .atd-calc {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
        }
        .atd-calc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .atd-calc-icon {
          width: 38px; height: 38px; border-radius: 12px;
          background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.25);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .atd-calc-title { font-size: 15px; font-weight: 700; color: #fff; }
        .atd-calc-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 1px; }
        .atd-calc-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 12px; }
        .atd-calc-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.75); }
        .atd-calc-input {
          width: 84px; text-align: right; padding: 6px 10px;
          border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.03); color: #fff;
          font-family: monospace; font-size: 13px; font-weight: 700;
          outline: none;
        }
        .atd-calc-input:focus { border-color: #16a34a; }
        .atd-calc-slider {
          width: 100%; accent-color: #16a34a; height: 6px; margin: 6px 0 4px;
        }
        .atd-calc-ticks {
          display: flex; justify-content: space-between;
          font-size: 10px; color: rgba(255,255,255,0.25); font-family: monospace;
          margin-bottom: 20px;
        }
        .atd-calc-result {
          border: 1.5px solid #16a34a; background: rgba(22,163,74,0.08);
          border-radius: 16px; padding: 18px;
        }
        .atd-calc-result-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .atd-calc-rec-tag {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: #4ade80; margin-bottom: 6px;
        }
        .atd-calc-rec-name { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
        .atd-calc-rec-detail { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; }
        .atd-calc-rec-price { font-size: 26px; font-weight: 800; color: #fff; letter-spacing: -0.02em; text-align: right; }
        .atd-calc-rec-period { font-size: 11px; color: rgba(255,255,255,0.35); text-align: right; }
        .atd-calc-stats {
          display: flex; gap: 20px; flex-wrap: wrap;
          margin-top: 14px; padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .atd-calc-stat-label { font-size: 11px; color: rgba(255,255,255,0.4); }
        .atd-calc-stat-val { font-size: 13px; font-weight: 700; color: #fff; margin-top: 1px; }
        .atd-calc-warning {
          margin-top: 12px; padding: 10px 12px; border-radius: 10px;
          background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25);
          font-size: 12px; color: #fbbf24; line-height: 1.5;
        }
        .atd-calc-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 16px; }
        .atd-calc-chip {
          border-radius: 10px; padding: 8px 4px; text-align: center;
          border: 1px solid rgba(255,255,255,0.07);
          transition: opacity 0.15s;
        }
        .atd-calc-chip-name { font-size: 10px; font-weight: 700; color: #fff; }
        .atd-calc-chip-price { font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 2px; font-family: monospace; }

        /* FAQ */
        .atd-faq {
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; overflow: hidden;
          margin-bottom: 8px;
          transition: border-color 0.2s;
        }
        .atd-faq--open { border-color: rgba(34,197,94,0.25); }
        .atd-faq__btn {
          width: 100%; display: flex; align-items: center;
          justify-content: space-between; gap: 16px;
          padding: 16px 20px;
          background: none; border: none; cursor: pointer;
          text-align: left;
          font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.8);
          font-family: inherit;
          transition: background 0.15s;
        }
        .atd-faq__btn:hover { background: rgba(255,255,255,0.03); }
        .atd-faq--open .atd-faq__btn { color: #fff; }
        .atd-faq__body {
          padding: 0 20px 18px;
          font-size: 13px; color: rgba(255,255,255,0.45);
          line-height: 1.75;
        }

        /* CTA block */
        .atd-cta-block {
          border-radius: 28px;
          border: 1px solid rgba(34,197,94,0.2);
          padding: 5rem 3rem;
          text-align: center;
          background: radial-gradient(ellipse at 50% 0%, rgba(22,163,74,0.14), transparent 65%);
          position: relative; overflow: hidden;
        }
        .atd-cta-block::before {
          content: '';
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 18px,
            rgba(34,197,94,0.02) 18px,
            rgba(34,197,94,0.02) 19px
          );
        }
        .atd-cta-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(1.8rem,3.5vw,2.8rem);
          font-weight: 800; letter-spacing: -0.025em;
          color: #fff; margin-bottom: 14px;
        }
        .atd-cta-sub {
          font-size: 15px; color: rgba(255,255,255,0.38);
          max-width: 400px; margin: 0 auto 2.5rem;
          line-height: 1.7;
        }
        .atd-cta-btns {
          display: flex; justify-content: center;
          flex-wrap: wrap; gap: 10px;
          position: relative;
        }

        /* Footer */
        .atd-footer {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 2.5rem 0;
        }
        .atd-footer-inner {
          max-width: 1120px; margin: 0 auto;
          padding: 0 2rem;
          display: flex; flex-direction: column;
          gap: 2rem;
        }
        .atd-footer-top {
          display: flex; justify-content: space-between;
          flex-wrap: wrap; gap: 2rem;
        }
        .atd-footer-links {
          display: flex; gap: 3rem;
        }
        .atd-footer-col-title {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: rgba(255,255,255,0.18);
          margin-bottom: 12px;
        }
        .atd-footer-link {
          display: block; font-size: 13px;
          color: rgba(255,255,255,0.32); text-decoration: none;
          margin-bottom: 8px; transition: color 0.15s;
          background: none; border: none; cursor: pointer;
          font-family: inherit;
        }
        .atd-footer-link:hover { color: #4ade80; }
        .atd-footer-bottom {
          display: flex; justify-content: space-between;
          align-items: center; flex-wrap: wrap; gap: 8px;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 11px; color: rgba(255,255,255,0.14);
        }

        /* WhatsApp FAB */
        .atd-fab {
          position: fixed; bottom: 24px; right: 24px; z-index: 40;
          display: inline-flex; align-items: center; gap: 8px;
          background: #16a34a; color: #fff;
          padding: 12px 18px; border-radius: 16px;
          font-size: 13px; font-weight: 700;
          text-decoration: none;
          box-shadow: 0 8px 28px rgba(22,163,74,0.4);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .atd-fab:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 36px rgba(22,163,74,0.5);
        }

        /* Modal */
        .atd-modal-bg {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .atd-modal {
          width: 100%; max-width: 380px;
          background: #071208;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px; padding: 2rem;
        }
        .atd-modal-head {
          display: flex; justify-content: space-between;
          align-items: flex-start; margin-bottom: 1.5rem;
        }
        .atd-modal-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 18px; font-weight: 700; color: #fff;
        }
        .atd-modal-sub { font-size: 13px; color: rgba(255,255,255,0.32); margin-top: 3px; }
        .atd-modal-close {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(255,255,255,0.06); border: none;
          cursor: pointer; color: rgba(255,255,255,0.4);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .atd-modal-close:hover { background: rgba(255,255,255,0.12); }
        .atd-modal-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: rgba(255,255,255,0.35);
          margin-bottom: 8px; display: block;
        }
        .atd-modal-input {
          width: 100%; padding: 11px 36px 11px 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; color: #fff; font-size: 14px;
          font-family: inherit; outline: none;
          transition: border-color 0.15s;
        }
        .atd-modal-input:focus { border-color: rgba(34,197,94,0.5); }
        .atd-modal-input::placeholder { color: rgba(255,255,255,0.2); }
        .atd-modal-hint { font-size: 11px; color: rgba(255,255,255,0.2); margin-top: 6px; }
        .atd-modal-error {
          padding: 10px 14px; border-radius: 10px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          font-size: 12px; color: #fca5a5;
          margin-top: 10px;
        }
        .atd-modal-submit {
          width: 100%; padding: 12px;
          border-radius: 12px; background: #16a34a;
          color: #fff; font-size: 14px; font-weight: 700;
          border: none; cursor: pointer; margin-top: 14px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-family: inherit;
          transition: background 0.15s;
        }
        .atd-modal-submit:hover:not(:disabled) { background: #15803d; }
        .atd-modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .atd-modal-footer {
          text-align: center; font-size: 12px;
          color: rgba(255,255,255,0.22); margin-top: 14px;
        }
        .atd-modal-footer a { color: #4ade80; text-decoration: none; }
        .atd-modal-footer a:hover { text-decoration: underline; }

        /* Divider line */
        .atd-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        /* Download button (Android APK) */
        .atd-btn-download {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 22px; border-radius: 14px;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.3);
          color: #4ade80;
          font-weight: 700; font-size: 15px;
          text-decoration: none; cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          font-family: inherit;
        }
        .atd-btn-download:hover {
          background: rgba(34,197,94,0.14);
          transform: translateY(-2px);
        }

        /* Responsive nav links */
        @media(max-width:768px){
          .atd-nav-links { display: none; }
        }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────── */}
      <nav className="atd-nav">
        <div className="atd-nav-inner">
          <div className="atd-nav-logo">
            <div className="atd-nav-icon">
              <GraduationCap size={16} color="#fff" />
            </div>
            <span className="atd-nav-wordmark">Attendy</span>
            <span className="atd-nav-pill">Edu</span>
          </div>
          <div className="atd-nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a href="/portal">Parent Portal</a>
          </div>
          <button className="atd-nav-btn" onClick={() => setShowModal(true)}>
            Staff Login
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="atd-hero">
        <div className="atd-hero-grid">

          {/* Left — copy */}
          <div>
            <div style={s(0)}>
              <ScanCounter />
            </div>

            <div style={{ ...s(120), marginTop: "1.5rem", marginBottom: "1.25rem" }}>
              <span className="atd-hero-tag">
                <Zap size={10} />
                Built for Nigerian Schools · QR Attendance
              </span>
            </div>

            {/* Typing headline */}
            <h1
              ref={h1Ref as React.RefObject<HTMLHeadingElement>}
              className="atd-h1"
              style={s(200)}
              aria-live="polite"
              aria-label="Attendy — school attendance management"
            />

            <p className="atd-hero-sub" style={s(340)}>
              Students tap their QR card at the gate. Logged, marked on-time
              or late, parent texted — all before they reach their classroom.
              No paper. No calls. No guessing.
            </p>

            <div className="atd-hero-btns" style={s(460)}>
              <a
                className="atd-btn-primary"
                href="https://wa.me/2348077291745?text=Hi%2C%20I%20want%20to%20set%20up%20Attendy%20for%20my%20school"
                target="_blank" rel="noopener noreferrer"
              >
                <MessageCircle size={17} />
                Start Free Trial on WhatsApp
              </a>
              <button className="atd-btn-ghost" onClick={() => setShowModal(true)}>
                Staff Login <ArrowRight size={14} />
              </button>
              {apkUrl && (
                <a className="atd-btn-download" href={apkUrl} download>
                  <Download size={16} />
                  Download for Android
                </a>
              )}
            </div>

            <div className="atd-trust-row" style={s(560)}>
              {["Free first month","No hardware needed","Works on ₦30k Android","Setup in 2 hours"].map(t => (
                <span className="atd-trust-item" key={t}>
                  <CheckCircle size={11} color="#16a34a" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — image with chips */}
          <div className="atd-hero-img-col" style={s(180)}>
            <div className="atd-hero-img-frame">
              <Image
                src="/images/hero-scan.jpg"
                alt="Gateman scanning student QR card at school gate"
                fill style={{ objectFit: "cover", objectPosition: "center" }}
                priority
              />
              <div className="atd-hero-img-overlay" />
            </div>

            {/* Scan result chip */}
            <div className="atd-chip atd-chip-scan">
              <div className="atd-chip-scan-title">
                <CheckCircle size={11} color="#4ade80" />
                Attendance Recorded
              </div>
              <div className="atd-chip-scan-name">Emeka Okafor · SS2 Gold</div>
              <div className="atd-chip-scan-sub">On time · 7:34 AM · SMS sent ✓</div>
            </div>

            {/* Stats chip */}
            <div className="atd-chip atd-chip-stat">
              <div className="atd-chip-stat-num">247</div>
              <div className="atd-chip-stat-lbl">scans today</div>
            </div>
          </div>
        </div>

        {/* Before / After */}
        <div className="atd-ba-wrap">
          <div className="atd-ba-grid">
            <div className="atd-ba-col" style={{ background: "rgba(239,68,68,0.03)" }}>
              <div className="atd-ba-tag" style={{ color: "#f87171" }}>
                <X size={11} /> Without Attendy
              </div>
              {[
                "Paper register at the gate",
                "Teacher calls parent to check",
                "Month-end report takes 2 days",
                "No proof of who arrived when",
                "Absent list manually counted",
              ].map(t => (
                <div className="atd-ba-row atd-ba-row--bad" key={t}>
                  <span style={{ color: "rgba(239,68,68,0.5)", flexShrink: 0 }}>—</span> {t}
                </div>
              ))}
            </div>
            <div className="atd-ba-col" style={{ background: "rgba(34,197,94,0.02)" }}>
              <div className="atd-ba-tag" style={{ color: "#4ade80" }}>
                <CheckCircle size={11} /> With Attendy
              </div>
              {[
                "QR scan at gate in 0.3 seconds",
                "SMS to parent instantly",
                "Reports ready any time",
                "Every scan timestamped",
                "Absent list auto-generated",
              ].map(t => (
                <div className="atd-ba-row atd-ba-row--good" key={t}>
                  <span style={{ color: "#4ade80", flexShrink: 0 }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ───────────────────────────────── */}
      <div className="atd-proof-strip">
        <div className="atd-proof-inner">
          {SOCIAL_PROOF.map(({ icon: Icon, text }, i) => (
            <span className="atd-proof-item" key={i}>
              <Icon size={14} color="#16a34a" />
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <div
        id="how"
        ref={howRev.ref}
        className={`atd-section ${howRev.revealed ? "atd-revealed" : ""}`}
      >
        <div className="atd-section-head">
          <div className="atd-section-tag">How it works</div>
          <h2 className="atd-section-title">Up and running this afternoon.</h2>
          <p className="atd-section-sub">Three steps from sign-up to your first scan.</p>
        </div>

        {/* Step 1 */}
        <div className="atd-step">
          <div className="atd-step-img">
            <Image src="/images/hero-scan.jpg" alt="Register students and print QR cards" fill style={{ objectFit: "cover" }} />
          </div>
          <div>
            <div className="atd-step-num">01</div>
            <div className="atd-step-title">Register students, print cards.</div>
            <p className="atd-step-body">Add students via CSV bulk upload or one-by-one. QR ID cards are generated instantly with your school logo and colours. Print on plain cardstock. Ready to scan in minutes.</p>
            <div className="atd-pill-row">
              {["Bulk CSV import","School logo on every card","Instant QR generation"].map(t => <span className="atd-pill" key={t}>{t}</span>)}
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="atd-step">
          <div style={{ order: 2 }}>
            <div className="atd-step-img" style={{ background: "rgba(22,163,74,0.05)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
              <Image src="/images/scanner-app.png" alt="Scanner app showing successful check-in" width={280} height={400} style={{ width: "100%", maxWidth: 240, height: "auto" }} />
            </div>
          </div>
          <div style={{ order: 1 }}>
            <div className="atd-step-num">02</div>
            <div className="atd-step-title">Gateman scans. Green light, move in.</div>
            <p className="atd-step-body">Open the scanner on any Android phone. Students present their QR card. Green for registered, red for unknown. 0.3 seconds. No typing. No searching.</p>
            <div className="atd-pill-row">
              {["Any Android camera","Works offline","0.3-second response"].map(t => <span className="atd-pill" key={t}>{t}</span>)}
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="atd-step">
          <div className="atd-step-img" style={{ background: "#07120a", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingTop: "2rem", overflow: "hidden", position: "relative" }}>
            <Image src="/images/sms-notify.png" alt="Parent SMS notification" width={240} height={400} style={{ width: "100%", maxWidth: 200, height: "auto" }} />
            <div style={{ position: "absolute", bottom: 16, right: 16, width: 72, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Image src="/images/qr-card.png" alt="QR card" width={144} height={200} style={{ width: "100%", height: "auto" }} />
            </div>
          </div>
          <div>
            <div className="atd-step-num">03</div>
            <div className="atd-step-title">Parent gets the SMS. Automatically.</div>
            <p className="atd-step-body">Within seconds of the scan, the parent receives a text — child's name, arrival time, on-time or late. If the student hasn't scanned by 9 AM, an absence alert fires automatically.</p>
            <div className="atd-pill-row">
              {["Instant SMS","Late flagging","Auto absence alerts","No parent app needed"].map(t => <span className="atd-pill" key={t}>{t}</span>)}
            </div>
          </div>
        </div>
      </div>

      <hr className="atd-divider" />

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <div
        id="features"
        ref={featuresRev.ref}
        className={`atd-section ${featuresRev.revealed ? "atd-revealed" : ""}`}
      >
        <div className="atd-section-head">
          <div className="atd-section-tag">Features</div>
          <h2 className="atd-section-title">Everything your school needs.</h2>
          <p className="atd-section-sub">One platform. No add-ons. No hardware.</p>
        </div>
        <div className="atd-feature-grid">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <div className="atd-feature-card" key={title}>
              <div className="atd-feature-icon" style={{ background: bg }}>
                <Icon size={18} color={color} />
              </div>
              <div className="atd-feature-title">{title}</div>
              <div className="atd-feature-desc">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="atd-divider" />

      {/* ── QR CARD SHOWCASE ─────────────────────────────────── */}
      <div className="atd-section" style={{ opacity: 1, transform: "none" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center" }}>
          <div>
            <div className="atd-section-tag">Student ID cards</div>
            <h2 className="atd-section-title" style={{ textAlign: "left", marginBottom: "14px" }}>Your school's card. Your school's brand.</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.42)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              Design student ID cards in the Attendy dashboard — add your school logo, name, colours, and the student's photo. Download as PNG and print on plain cardstock or laminate sheets.
            </p>
            {["School logo and custom colours","Student photo and class details","Unique QR code per student","Download PNG, print anywhere"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 10 }}>
                <CheckCircle size={14} color="#22c55e" style={{ flexShrink: 0 }} /> {t}
              </div>
            ))}
            <div style={{ marginTop: "1.5rem" }}>
              <a className="atd-btn-primary" href="https://wa.me/2348077291745" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <MessageCircle size={15} /> Get started on WhatsApp
              </a>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <div style={{ width: 190, borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", transform: "rotate(-2deg)", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
              <Image src="/images/qr-card.png" alt="Student QR card" width={380} height={540} style={{ width: "100%", height: "auto" }} />
            </div>
            <div style={{ width: 150, borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", transform: "rotate(1.5deg)", boxShadow: "0 18px 48px rgba(0,0,0,0.35)" }}>
              <Image src="/images/scanner-app.png" alt="Scanner app" width={300} height={440} style={{ width: "100%", height: "auto" }} />
            </div>
          </div>
        </div>
      </div>

      <hr className="atd-divider" />

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <div className="atd-section" style={{ opacity: 1, transform: "none" }}>
        <div className="atd-section-head">
          <div className="atd-section-tag">From schools using Attendy</div>
          <h2 className="atd-section-title">Nigerian schools love it.</h2>
        </div>
        <div className="atd-testi-grid">
          {[
            { q: "Before Attendy, our gateman had a paper book and parents called us five times a morning. Now the SMS goes out before the child reaches their classroom.", name: "Mrs. Adaobi Nwosu", role: "Head Teacher · Greenleaf Academy, Abuja", initials: "AN", color: "#16a34a" },
            { q: "Setup was done in one afternoon. The CSV import worked perfectly and the QR cards printed well on plain cardstock. Our PTA praised us at the next meeting.", name: "Mr. Tunde Afolabi", role: "School Administrator · Sunrise International, Lagos", initials: "TA", color: "#0369a1" },
          ].map(({ q, name, role, initials, color }) => (
            <div className="atd-testi-card" key={name}>
              <div className="atd-stars">
                {[1,2,3,4,5].map(i => <span key={i} className="atd-star">★</span>)}
              </div>
              <p className="atd-testi-body">"{q}"</p>
              <div className="atd-testi-footer">
                <div className="atd-testi-avatar" style={{ background: color + "22", color }}>
                  {initials}
                </div>
                <div>
                  <div className="atd-testi-name">{name}</div>
                  <div className="atd-testi-role">{role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr className="atd-divider" />

      {/* ── PRICING ──────────────────────────────────────────── */}
      <div
        id="pricing"
        ref={pricingRev.ref}
        className={`atd-section ${pricingRev.revealed ? "atd-revealed" : ""}`}
      >
        <div className="atd-section-head">
          <div className="atd-section-tag">Pricing</div>
          <h2 className="atd-section-title">Simple plans, all in Naira.</h2>
          <p className="atd-section-sub">Every plan starts with a free first month. SMS overage is blocked, never billed.</p>
        </div>
        <PriceCalculator prices={prices} limits={limits} />
        <div className="atd-plan-grid">
          {PLANS.map(plan => (
            <div className={`atd-plan ${plan.highlight ? "atd-plan--highlight" : ""}`} key={plan.name}>
              {plan.badge && <div className="atd-plan-badge">{plan.badge}</div>}
              <div className="atd-plan-name">{plan.name}</div>
              <div style={{ marginBottom: 4 }}>
                <span className="atd-plan-price">{plan.price}</span>
                <span className="atd-plan-period">/{plan.period}</span>
              </div>
              <hr className="atd-plan-divider" />
              <div className="atd-plan-row">
                <span className="atd-plan-row-label">Students</span>
                <span className="atd-plan-row-val">{plan.members.toLocaleString()}</span>
              </div>
              <div className="atd-plan-row">
                <span className="atd-plan-row-label">SMS/month</span>
                <span className="atd-plan-row-val">{plan.sms.toLocaleString()}</span>
              </div>
              <div className="atd-plan-row">
                <span className="atd-plan-row-label">Admins</span>
                <span className="atd-plan-row-val">∞</span>
              </div>
              <a
                href="https://wa.me/2348077291745"
                target="_blank" rel="noopener noreferrer"
                className={`atd-plan-cta ${plan.highlight ? "atd-plan-cta--highlight" : "atd-plan-cta--default"}`}
              >
                {plan.cta} →
              </a>
            </div>
          ))}
        </div>
      </div>

      <hr className="atd-divider" />

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <div
        id="faq"
        ref={faqRev.ref}
        className={`atd-section ${faqRev.revealed ? "atd-revealed" : ""}`}
        style={{ maxWidth: 680 }}
      >
        <div className="atd-section-head">
          <div className="atd-section-tag">FAQ</div>
          <h2 className="atd-section-title">Common questions.</h2>
        </div>
        {FAQS.map(f => <Faq key={f.q} q={f.q} a={f.a} />)}
        <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.28)", marginTop: "2rem" }}>
          Still have questions?{" "}
          <a href="https://wa.me/2348077291745" target="_blank" rel="noopener noreferrer" style={{ color: "#4ade80", textDecoration: "none" }}>
            Chat with us on WhatsApp →
          </a>
        </p>
      </div>

      <hr className="atd-divider" />

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <div
        ref={ctaRev.ref}
        className={`atd-section ${ctaRev.revealed ? "atd-revealed" : ""}`}
      >
        <div className="atd-cta-block">
          <h2 className="atd-cta-title">Ready to modernise your school?</h2>
          <p className="atd-cta-sub">We onboard most schools in under 2 hours on WhatsApp. Free trial for your first 30 days — no card, no commitment.</p>
          <div className="atd-cta-btns">
            <a
              className="atd-btn-primary"
              href="https://wa.me/2348077291745?text=Hi%2C%20I%20want%20to%20set%20up%20Attendy%20for%20my%20school"
              target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <MessageCircle size={17} /> Chat on WhatsApp
            </a>
            <a className="atd-btn-ghost" href="/portal" style={{ textDecoration: "none" }}>
              Parent Portal
            </a>
          </div>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="atd-footer">
        <div className="atd-footer-inner">
          <div className="atd-footer-top">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <GraduationCap size={13} color="#fff" />
                </div>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 15 }}>Attendy Edu</span>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", maxWidth: 200, lineHeight: 1.6 }}>
                QR attendance for Nigerian schools. One scan. Instant notification. Complete record.
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", marginTop: 10 }}>🇳🇬 Proudly Nigerian</p>
            </div>
            <div className="atd-footer-links">
              <div>
                <div className="atd-footer-col-title">Product</div>
                {[["#features","Features"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href, label]) => (
                  <a key={label} href={href} className="atd-footer-link">{label}</a>
                ))}
              </div>
              <div>
                <div className="atd-footer-col-title">Access</div>
                <a href="/portal" className="atd-footer-link">Parent Portal</a>
                <button className="atd-footer-link" onClick={() => setShowModal(true)}>Staff Login</button>
                {apkUrl && <a href={apkUrl} download className="atd-footer-link">Download Android App</a>}
              </div>
            </div>
          </div>
          <div className="atd-footer-bottom">
            <span>© 2026 Attendy. All rights reserved.</span>
            <span>Powered by Supabase · Termii</span>
          </div>
        </div>
      </footer>

      {/* ── FLOATING WHATSAPP ────────────────────────────────── */}
      <a
        className="atd-fab"
        href="https://wa.me/2348077291745?text=Hi%2C%20I%20want%20to%20set%20up%20Attendy%20for%20my%20school"
        target="_blank" rel="noopener noreferrer"
      >
        <MessageCircle size={17} />
        <span style={{ display: "none" }} className="sm-show">WhatsApp us</span>
      </a>
      <style>{`.sm-show { display: inline !important; } @media(max-width:480px){.sm-show{display:none!important}}`}</style>

      {/* ── STAFF LOGIN MODAL ────────────────────────────────── */}
      {showModal && (
        <div className="atd-modal-bg" onClick={() => setShowModal(false)}>
          <div className="atd-modal" onClick={e => e.stopPropagation()}>
            <div className="atd-modal-head">
              <div>
                <div className="atd-modal-title">Staff Login</div>
                <div className="atd-modal-sub">Enter your school ID to continue</div>
              </div>
              <button className="atd-modal-close" onClick={() => setShowModal(false)}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleLogin}>
              <label className="atd-modal-label">School ID</label>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)" }} />
                <input
                  type="text"
                  value={slug}
                  onChange={e => { setSlug(e.target.value); setSlugError(null); }}
                  placeholder="e.g. greenfield-academy"
                  required autoComplete="off"
                  className="atd-modal-input"
                  style={{ paddingLeft: 34 }}
                />
              </div>
              <div className="atd-modal-hint">Provided by your school admin</div>

              {slugError && <div className="atd-modal-error">{slugError}</div>}

              <button
                type="submit"
                disabled={checking || !slug.trim()}
                className="atd-modal-submit"
              >
                {checking
                  ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Checking…</>
                  : <>Continue to Login <ArrowRight size={14} /></>}
              </button>
            </form>

            <div className="atd-modal-footer">
              Parent?{" "}
              <a href="/portal">Use the Parent Portal →</a>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}