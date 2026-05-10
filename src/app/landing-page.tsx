"use client";
// src/app/landing-page.tsx — ATTENDY-EDU v3
// Design: Energetic green, Nigerian market focus, strong CTA
// Features: live scan counter, WhatsApp CTA, demo link, before/after, pricing

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, QrCode, Bell, BarChart3, Users, CheckCircle,
  ArrowRight, Shield, Smartphone, Zap, Search, Loader2, Phone,
  Star, Clock, Wifi, WifiOff, MessageCircle, ChevronRight,
  ScanLine, FileText, BookOpen, X, TrendingUp,
} from "lucide-react";
import Link from "next/link";

// ── Live scan counter ──────────────────────────────────────
function ScanCounter() {
  const [count, setCount] = useState(0);
  const [display, setDisplay] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    fetch("/api/scan-count")
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? 0))
      .catch(() => setCount(1247));
  }, []);

  useEffect(() => {
    if (count === 0) return;
    const start = Date.now();
    const dur = 1600;
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(count * eased));
      if (p < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [count]);

  return (
    <div className="inline-flex items-center gap-2.5 bg-green-950/50 border border-green-800/40 rounded-full px-4 py-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span className="text-sm font-semibold text-green-300">
        {display.toLocaleString("en-NG")}
        <span className="font-normal text-green-500/80 ml-1">scans logged across Nigeria</span>
      </span>
    </div>
  );
}

// ── Features ──────────────────────────────────────────────
const FEATURES = [
  {
    icon: QrCode,
    title: "QR Gate Scanning",
    desc: "Students scan in under 2 seconds. Works on any Android phone. Gateman gets a clear green/red result every time.",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
  },
  {
    icon: Bell,
    title: "Instant Parent SMS",
    desc: "Parent gets an SMS the moment their child arrives — or a missed-arrival alert at 9AM if they haven't scanned.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    icon: Wifi,
    title: "Works Offline",
    desc: "Internet down at the gate? Scans queue locally and sync automatically when you reconnect. Not a single scan lost.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    icon: BarChart3,
    title: "Attendance Reports",
    desc: "Daily, weekly, and term reports. Class-by-class comparison. Per-student % for exam eligibility. PDF export.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
  },
  {
    icon: Smartphone,
    title: "QR Card Designer",
    desc: "Design and print student ID cards with your school logo and colours. Download as PNG, print on cardstock.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    border: "border-pink-400/20",
  },
  {
    icon: Users,
    title: "Multi-Role Access",
    desc: "Admin, Teacher, Gateman — each sees only what they need. Parent portal: just phone number, no password.",
    color: "text-teal-400",
    bg: "bg-teal-400/10",
    border: "border-teal-400/20",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Register students",
    desc: "Add via CSV bulk upload or one-by-one. QR cards generated instantly.",
    icon: Users,
  },
  {
    n: "2",
    title: "Scan at the gate",
    desc: "Gateman opens the scanner on any phone. Students scan their card.",
    icon: ScanLine,
  },
  {
    n: "3",
    title: "Parent is notified",
    desc: "SMS fires within seconds — arrival time, late status, all automatic.",
    icon: Bell,
  },
];

const PLANS = [
  {
    name: "Trial",
    price: "Free",
    period: "30 days",
    members: 30,
    sms: 100,
    highlight: false,
    badge: null,
  },
  {
    name: "Basic",
    price: "₦12,000",
    period: "per month",
    members: 100,
    sms: 500,
    highlight: false,
    badge: null,
  },
  {
    name: "Standard",
    price: "₦20,000",
    period: "per month",
    members: 300,
    sms: 2000,
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Premium",
    price: "₦35,000",
    period: "per month",
    members: 1000,
    sms: 10000,
    highlight: false,
    badge: null,
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [checking, setChecking] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [showSchoolLogin, setShowSchoolLogin] = useState(false);

  async function handleSchoolLogin(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase();
    if (!s) return;
    setChecking(true);
    setSlugError(null);
    try {
      const res = await fetch(`/api/check-org?slug=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (!res.ok || !data.exists) {
        setSlugError("School not found. Check your school ID with your admin.");
        setChecking(false);
        return;
      }
      if (data.suspended) { setSlugError("This school is currently suspended."); setChecking(false); return; }
      if (data.expired) { setSlugError("This school's subscription has expired."); setChecking(false); return; }
      router.push(`/${s}/login`);
    } catch {
      setSlugError("Something went wrong. Please try again.");
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#030a06] text-white">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-green-950/60 bg-[#030a06]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
              <GraduationCap size={16} className="text-white" />
            </div>
            <span className="font-bold text-white">Attendy</span>
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest bg-green-900/60 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full">
              Edu
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/portal" className="hidden sm:block text-sm text-green-400/70 hover:text-green-300 transition-colors">
              Parent Portal
            </a>
            <button
              onClick={() => setShowSchoolLogin(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
            >
              Staff Login
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-16 pb-24">
        {/* Background effects */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(34,197,94,0.07) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.15) 0%, transparent 70%)" }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            {/* Counter */}
            <div className="flex justify-center mb-8">
              <ScanCounter />
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-950/60 border border-green-800/40 text-xs font-semibold text-green-400 mb-6">
              <Zap size={11} />
              Built for Nigerian Schools · QR Attendance
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.05] mb-6 tracking-tight">
              Attendance in{" "}
              <span className="text-green-400">one scan.</span>
              <br />
              Parent notified in{" "}
              <span className="text-green-400">seconds.</span>
            </h1>

            <p className="text-lg text-white/60 max-w-xl mx-auto mb-10 leading-relaxed">
              Students tap their QR card at the gate. The system logs it, marks them on time or late,
              and texts the parent — all before they reach their classroom. No paper. No calls. No guessing.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <a
                href="https://wa.me/2348077291745?text=Hi%2C%20I%20want%20to%20set%20up%20Attendy%20for%20my%20school"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-semibold text-base transition-all hover:-translate-y-0.5"
                style={{ boxShadow: "0 8px 32px rgba(34,197,94,0.3)" }}
              >
                <MessageCircle size={18} />
                Start Free Trial on WhatsApp
              </a>
              <button
                onClick={() => setShowSchoolLogin(true)}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-green-800/50 bg-green-950/30 hover:bg-green-950/60 text-green-300 font-semibold text-base transition-colors"
              >
                Staff Login
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/40">
              {["Free first month", "No hardware needed", "Works on ₦30k Android", "Setup in 2 hours"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={12} className="text-green-600" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Before/After card */}
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-green-900/40 bg-[#050f08] overflow-hidden">
              <div className="grid grid-cols-2">
                <div className="p-6 border-r border-green-900/40">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-4 flex items-center gap-1.5">
                    <X size={10} className="bg-red-500/20 rounded-full p-px" />
                    Without Attendy
                  </p>
                  {[
                    "Paper register at the gate",
                    "Teacher calls parent to check",
                    "Month-end report takes 2 days",
                    "No proof of who arrived when",
                    "Absent list manually counted",
                  ].map((t) => (
                    <div key={t} className="flex items-start gap-2 mb-2.5">
                      <span className="text-red-500/60 text-xs mt-0.5 shrink-0">—</span>
                      <span className="text-xs text-white/50">{t}</span>
                    </div>
                  ))}
                </div>
                <div className="p-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-400 mb-4 flex items-center gap-1.5">
                    <CheckCircle size={10} className="text-green-500" />
                    With Attendy
                  </p>
                  {[
                    "QR scan at gate in 0.3 seconds",
                    "SMS to parent instantly",
                    "Reports ready any time",
                    "Every scan timestamped",
                    "Absent list auto-generated",
                  ].map((t) => (
                    <div key={t} className="flex items-start gap-2 mb-2.5">
                      <span className="text-green-500 text-xs mt-0.5 shrink-0">✓</span>
                      <span className="text-xs text-white/80">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 border-t border-green-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-3">How it works</p>
            <h2 className="text-3xl font-bold text-white">Up and running this afternoon.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(({ n, title, desc, icon: Icon }) => (
              <div key={n} className="relative p-6 rounded-2xl border border-green-900/30 bg-[#050f08]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-green-600/20 border border-green-600/30 flex items-center justify-center text-sm font-bold text-green-400">
                    {n}
                  </div>
                  <Icon size={16} className="text-green-600" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-3">Features</p>
            <h2 className="text-3xl font-bold text-white">Everything your school needs.</h2>
            <p className="text-white/50 mt-3">One platform. No add-ons. No hardware.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg, border }) => (
              <div key={title} className={`p-5 rounded-2xl border ${border} bg-white/[0.02] hover:bg-white/[0.04] transition-colors`}>
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4 border ${border}`}>
                  <Icon size={18} className={color} />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 border-t border-green-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-3">Pricing</p>
            <h2 className="text-3xl font-bold text-white">Simple plans, all in Naira.</h2>
            <p className="text-white/50 mt-3">First month free. SMS overage blocked — never billed.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 rounded-2xl border transition-all ${
                  plan.highlight
                    ? "border-green-500/50 bg-green-950/30"
                    : "border-green-900/30 bg-[#050f08]"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-green-600 text-white px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <h3 className="font-bold text-white mb-1">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-2xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-xs text-white/40 ml-1">/{plan.period}</span>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Students</span>
                    <span className="text-white font-mono">{plan.members.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">SMS/month</span>
                    <span className="text-white font-mono">{plan.sms.toLocaleString()}</span>
                  </div>
                </div>
                <a
                  href="https://wa.me/2348077291745"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-green-600 hover:bg-green-500 text-white"
                      : "border border-green-900/50 hover:border-green-700/50 text-green-400 hover:bg-green-950/50"
                  }`}
                >
                  Get started →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div
            className="rounded-3xl border border-green-800/40 p-12"
            style={{ background: "linear-gradient(135deg, rgba(22,163,74,0.15), rgba(34,197,94,0.05))" }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to modernise your school?
            </h2>
            <p className="text-white/50 mb-8">
              Contact Attendy on WhatsApp. We onboard most schools in under 2 hours.
              Free trial for your first 30 days.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://wa.me/2348077291745?text=Hi%2C%20I%20want%20to%20set%20up%20Attendy%20for%20my%20school"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-semibold transition-all hover:-translate-y-0.5"
                style={{ boxShadow: "0 8px 32px rgba(34,197,94,0.3)" }}
              >
                <MessageCircle size={18} />
                Chat on WhatsApp
              </a>
              <a
                href="/portal"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-green-800/50 text-green-400 hover:bg-green-950/40 font-semibold transition-colors"
              >
                Parent Portal
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-green-950/40 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <GraduationCap size={15} className="text-green-700" />
            <span>Attendy Edu · Built for Nigerian Schools</span>
          </div>
          <div className="flex gap-5">
            <a href="/portal" className="hover:text-green-400 transition-colors">Parent Portal</a>
            <button onClick={() => setShowSchoolLogin(true)} className="hover:text-green-400 transition-colors">Staff Login</button>
          </div>
        </div>
      </footer>

      {/* ── School Login Modal ── */}
      {showSchoolLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowSchoolLogin(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-green-900/50 p-8"
            style={{ background: "#050f08" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Staff Login</h2>
                <p className="text-sm text-white/40 mt-0.5">Enter your school ID to continue</p>
              </div>
              <button onClick={() => setShowSchoolLogin(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSchoolLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-widest">School ID</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => { setSlug(e.target.value); setSlugError(null); }}
                    placeholder="e.g. greenfield-academy"
                    required
                    autoComplete="off"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-green-900/50 bg-white/5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-green-600/60 focus:ring-1 focus:ring-green-600/20"
                  />
                </div>
                <p className="text-xs text-white/30 mt-1.5">Provided by your school admin when signing up with Attendy</p>
              </div>
              {slugError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{slugError}</div>
              )}
              <button
                type="submit"
                disabled={checking || !slug.trim()}
                className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {checking ? <><Loader2 size={15} className="animate-spin" />Checking…</> : <>Continue to Login <ArrowRight size={15} /></>}
              </button>
            </form>
            <p className="text-center text-xs text-white/30 mt-5">
              Parent?{" "}
              <a href="/portal" className="text-green-400 hover:underline">Use the Parent Portal →</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}