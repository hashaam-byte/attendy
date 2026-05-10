"use client";
// src/app/landing-page.tsx — ATTENDY-EDU v4
// Redesigned: Dual theme, hero image, testimonial, FAQ, floating WhatsApp, rich visuals

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, QrCode, Bell, BarChart3, Users, CheckCircle,
  ArrowRight, Smartphone, Zap, Search, Loader2, Phone,
  Clock, Wifi, MessageCircle,
  ScanLine, X, Sun, Moon, ChevronDown, ChevronUp, Shield,
} from "lucide-react";
import Image from "next/image";

// ─────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

// ─────────────────────────────────────────────
// Live scan counter
// ─────────────────────────────────────────────
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
    <div className="inline-flex items-center gap-2.5 bg-green-950/50 dark:bg-green-950/50 light:bg-green-50 border border-green-800/40 rounded-full px-4 py-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span className="text-sm font-semibold text-green-300 dark:text-green-300">
        {display.toLocaleString("en-NG")}
        <span className="font-normal text-green-500/80 ml-1">scans logged across Nigeria</span>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
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
    image: "/images/sms-notify.png",
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
    image: "/images/dashboard.png",
  },
  {
    icon: Smartphone,
    title: "QR Card Designer",
    desc: "Design and print student ID cards with your school logo and colours. Download as PNG, print on cardstock.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    border: "border-pink-400/20",
    image: "/images/qr-card.png",
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
    n: "01",
    title: "Register students",
    desc: "Add via CSV bulk upload or one-by-one. QR cards generated instantly — ready to print in minutes.",
    icon: Users,
    detail: "Supports bulk CSV import · QR generated per student · School logo on every card",
  },
  {
    n: "02",
    title: "Scan at the gate",
    desc: "Gateman opens the scanner on any phone. Students tap their card. Green = in. Red = not enrolled.",
    icon: ScanLine,
    detail: "Works offline · Any Android camera · 0.3-second response",
  },
  {
    n: "03",
    title: "Parent is notified",
    desc: "SMS fires within seconds — arrival time, late status, absence alert at 9AM. Zero manual steps.",
    icon: Bell,
    detail: "Instant SMS · Late flagging · Auto absence alerts",
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
    cta: "Start free",
  },
  {
    name: "Basic",
    price: "₦12,000",
    period: "per month",
    members: 100,
    sms: 500,
    highlight: false,
    badge: null,
    cta: "Get started",
  },
  {
    name: "Standard",
    price: "₦20,000",
    period: "per month",
    members: 300,
    sms: 2000,
    highlight: true,
    badge: "Most popular",
    cta: "Get started",
  },
  {
    name: "Premium",
    price: "₦35,000",
    period: "per month",
    members: 1000,
    sms: 10000,
    highlight: false,
    badge: null,
    cta: "Get started",
  },
];

const FAQS = [
  {
    q: "Do students need a smartphone?",
    a: "No. Students only need their printed QR card — a laminated card or sticker. Only the gateman's phone needs to be online (and even then, it works offline).",
  },
  {
    q: "What if the internet goes down at the gate?",
    a: "The scanner works fully offline. It caches the student list when it loads. Scans queue locally and sync the moment you reconnect. A yellow banner shows 'Offline — syncing'. Not a single scan is lost.",
  },
  {
    q: "How do parents get notified?",
    a: "Parents receive an SMS the moment their child's QR card is scanned at the gate. If the child hasn't arrived by a configurable time (e.g. 9AM), an absence alert fires automatically. No app needed on the parent's phone.",
  },
  {
    q: "How long does setup take?",
    a: "For a typical school: 1–2 hours. Sign up, we activate your account same day, bulk-import students via CSV, print QR cards, and the gateman is scanning by next morning. No hardware purchase needed.",
  },
  {
    q: "Is our data secure?",
    a: "Yes. Data is stored in Supabase (SOC 2 Type II compliant). Row-Level Security is enforced — each school only ever sees its own data. Attendy staff cannot access your records.",
  },
  {
    q: "What happens when we hit an SMS limit?",
    a: "SMS overage is blocked, not billed. You'll never get a surprise charge. The dashboard shows your remaining SMS count in real time.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Before Attendy, our gateman had a paper book and parents called us five times a morning asking if their child arrived. Now the SMS goes out before the child reaches their classroom.",
    name: "Mrs. Adaobi Nwosu",
    role: "Head Teacher",
    school: "Greenleaf Academy, Abuja",
    initials: "AN",
    color: "bg-green-600",
  },
  {
    quote:
      "Setup was done in one afternoon. The CSV import worked perfectly and the QR cards printed well on plain cardstock. Our PTA praised us at the next meeting.",
    name: "Mr. Tunde Afolabi",
    role: "School Administrator",
    school: "Sunrise International School, Lagos",
    initials: "TA",
    color: "bg-blue-600",
  },
];

// ─────────────────────────────────────────────
// FAQ Item
// ─────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border border-green-900/30 dark:border-green-900/30 rounded-xl overflow-hidden bg-white/[0.02] dark:bg-white/[0.02]"
    >
      <button
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-sm font-semibold text-white dark:text-white">{q}</span>
        {open ? (
          <ChevronUp size={15} className="text-green-500 shrink-0" />
        ) : (
          <ChevronDown size={15} className="text-green-500 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm text-white/55 dark:text-white/55 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const { dark, toggle } = useTheme();
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
    <div className="min-h-screen bg-[#030a06] dark:bg-[#030a06] text-white transition-colors duration-300">

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

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-white/50">
            <a href="#how-it-works" className="hover:text-green-300 transition-colors">How it works</a>
            <a href="#features" className="hover:text-green-300 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-green-300 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-green-300 transition-colors">FAQ</a>
            <a href="/portal" className="hover:text-green-300 transition-colors">Parent Portal</a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-2 rounded-lg border border-green-900/40 text-white/40 hover:text-green-300 hover:border-green-700/50 transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
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
      <section className="relative overflow-hidden pt-16 pb-0">
        {/* Grid bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(34,197,94,0.07) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.13) 0%, transparent 70%)" }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pb-16 pt-4">
            {/* Left: copy */}
            <div>
              <div className="flex mb-7">
                <ScanCounter />
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-950/60 border border-green-800/40 text-xs font-semibold text-green-400 mb-6">
                <Zap size={11} />
                Built for Nigerian Schools · QR Attendance
              </div>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-[1.05] mb-6 tracking-tight">
                Attendance in{" "}
                <span className="text-green-400">one scan.</span>
                <br />
                Parent notified in{" "}
                <span className="text-green-400">seconds.</span>
              </h1>

              <p className="text-base text-white/55 max-w-lg mb-10 leading-relaxed">
                Students tap their QR card at the gate. The system logs it, marks them on time or late,
                and texts the parent — all before they reach their classroom. No paper. No calls. No guessing.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-3 mb-10">
                <a
                  href="https://wa.me/2348077291745?text=Hi%2C%20I%20want%20to%20set%20up%20Attendy%20for%20my%20school"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-all hover:-translate-y-0.5"
                  style={{ boxShadow: "0 8px 32px rgba(34,197,94,0.3)" }}
                >
                  <MessageCircle size={17} />
                  Start Free Trial on WhatsApp
                </a>
                <button
                  onClick={() => setShowSchoolLogin(true)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-green-800/50 bg-green-950/30 hover:bg-green-950/60 text-green-300 font-semibold text-sm transition-colors"
                >
                  Staff Login
                  <ArrowRight size={15} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs text-white/35">
                {["Free first month", "No hardware needed", "Works on ₦30k Android", "Setup in 2 hours"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle size={11} className="text-green-600" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: hero image + UI overlay */}
            <div className="relative hidden lg:block">
              {/* Main photo */}
              <div className="relative rounded-2xl overflow-hidden border border-green-900/40" style={{ aspectRatio: "4/3" }}>
                <Image
                  src="/images/hero-scan.jpg"
                  alt="School gateman scanning a student's QR ID card with an Android phone"
                  fill
                  className="object-cover"
                  priority
                />
                {/* Overlay gradient so UI chips read well */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#030a06]/80 via-transparent to-transparent" />

                {/* Scan result chip — bottom left */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2.5 bg-[#050f08]/90 border border-green-800/50 backdrop-blur rounded-xl px-3.5 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-green-600/25 flex items-center justify-center">
                    <CheckCircle size={14} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-none mb-0.5">Emeka Okafor · JSS 2B</p>
                    <p className="text-[10px] text-green-400">On time · 7:34 AM · SMS sent ✓</p>
                  </div>
                </div>

                {/* Stats chip — top right */}
                <div className="absolute top-4 right-4 bg-[#050f08]/90 border border-green-800/50 backdrop-blur rounded-xl px-3 py-2 text-center">
                  <p className="text-lg font-extrabold text-green-400 leading-none">247</p>
                  <p className="text-[10px] text-white/50 mt-0.5">scans today</p>
                </div>
              </div>

              {/* SMS notification card — floats below-right */}
              <div className="absolute -bottom-6 -right-4 w-56 bg-[#050f08] border border-green-900/50 rounded-2xl shadow-2xl p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-green-900/60 flex items-center justify-center shrink-0">
                    <Phone size={13} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">SMS · Just now</p>
                    <p className="text-xs text-white/80 leading-relaxed">
                      Attendy: <span className="text-green-400">Emeka arrived</span> at Greenleaf Academy at <span className="text-green-400">7:34 AM</span> ✓
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Before/After — full width below hero columns */}
          <div className="pb-16">
            <div className="rounded-2xl border border-green-900/40 bg-[#050f08] overflow-hidden">
              <div className="grid grid-cols-2">
                <div className="p-6 border-r border-green-900/40">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-4 flex items-center gap-1.5">
                    <X size={10} />
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
                      <span className="text-xs text-white/45">{t}</span>
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
                      <span className="text-xs text-white/75">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof strip ── */}
      <section className="border-y border-green-950/40 bg-green-950/10 py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-8 text-sm text-white/40">
          <span className="flex items-center gap-2">
            <GraduationCap size={14} className="text-green-600" />
            <strong className="text-white">14+ schools</strong> onboarded
          </span>
          <span className="hidden sm:block w-px h-4 bg-green-900/60" />
          <span className="flex items-center gap-2">
            <Users size={14} className="text-green-600" />
            <strong className="text-white">1,200+</strong> students enrolled
          </span>
          <span className="hidden sm:block w-px h-4 bg-green-900/60" />
          <span className="flex items-center gap-2">
            <Clock size={14} className="text-green-600" />
            Average setup: <strong className="text-white ml-1">under 2 hours</strong>
          </span>
          <span className="hidden sm:block w-px h-4 bg-green-900/60" />
          <span className="flex items-center gap-2">
            <Shield size={14} className="text-green-600" />
            <strong className="text-white">₦0</strong> hardware needed
          </span>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Up and running this afternoon.</h2>
            <p className="text-white/45 mt-3 max-w-md mx-auto text-sm">Three steps from sign-up to your first scan. No IT team needed.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-green-800/40 to-transparent" />

            {STEPS.map(({ n, title, desc, icon: Icon, detail }) => (
              <div key={n} className="relative p-6 rounded-2xl border border-green-900/30 bg-[#050f08] flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-sm font-extrabold text-white">
                    {n}
                  </div>
                  <Icon size={16} className="text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">{title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed mb-4">{desc}</p>
                  <div className="border-t border-green-900/30 pt-3">
                    <p className="text-[11px] text-green-600/80 leading-relaxed">{detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 border-t border-green-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Everything your school needs.</h2>
            <p className="text-white/45 mt-3 text-sm">One platform. No add-ons. No hardware.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg, border, image }) => (
              <div
                key={title}
                className={`p-5 rounded-2xl border ${border} bg-white/[0.02] hover:bg-white/[0.04] transition-colors flex flex-col gap-4`}
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center border ${border}`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">{title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
                </div>
                {/* Feature image if provided */}
                {image && (
                  <div className="relative h-32 rounded-xl overflow-hidden border border-white/5 mt-auto">
                    <Image
                      src={image}
                      alt={title}
                      fill
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 border-t border-green-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-3">From schools using Attendy</p>
            <h2 className="text-3xl font-bold text-white">Nigerian schools love it.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map(({ quote, name, role, school, initials, color }) => (
              <div
                key={name}
                className="p-7 rounded-2xl border border-green-900/30 bg-[#050f08] flex flex-col gap-5"
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {Array(5).fill(0).map((_, i) => (
                    <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="#22c55e">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-white/70 leading-relaxed italic">"{quote}"</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-xs font-bold text-white`}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-white/40">{role} · {school}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 border-t border-green-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Simple plans, all in Naira.</h2>
          </div>
          {/* Free trial banner */}
          <div className="max-w-xl mx-auto mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-950/50 border border-green-800/40 text-sm text-green-300">
              <CheckCircle size={14} className="text-green-500" />
              Every plan starts with a <strong className="text-white mx-1">free first month</strong> — no card needed.
              SMS overage is blocked, never billed.
            </div>
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
                <div className="mb-5">
                  <span className="text-2xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-xs text-white/35 ml-1">/{plan.period}</span>
                </div>
                <div className="space-y-2.5 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/45">Students</span>
                    <span className="text-white font-mono font-semibold">{plan.members.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/45">SMS/month</span>
                    <span className="text-white font-mono font-semibold">{plan.sms.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/45">Admins</span>
                    <span className="text-white font-mono font-semibold">Unlimited</span>
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
                  {plan.cta} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 border-t border-green-950/40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-3">FAQ</p>
            <h2 className="text-3xl font-bold text-white">Common questions.</h2>
            <p className="text-white/45 mt-3 text-sm">Everything you need to know before getting started.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="text-sm text-white/40 mb-4">Still have questions? We reply on WhatsApp within 30 minutes.</p>
            <a
              href="https://wa.me/2348077291745"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-950/50 border border-green-800/40 text-green-300 text-sm font-semibold hover:bg-green-950/80 transition-colors"
            >
              <MessageCircle size={15} />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 border-t border-green-950/40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div
            className="rounded-3xl border border-green-800/40 p-10 sm:p-14"
            style={{ background: "linear-gradient(135deg, rgba(22,163,74,0.15), rgba(34,197,94,0.05))" }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to modernise your school?
            </h2>
            <p className="text-white/45 mb-8 text-sm leading-relaxed">
              Contact Attendy on WhatsApp. We onboard most schools in under 2 hours.
              Free trial for your first 30 days — no card, no commitment.
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
      <footer className="border-t border-green-950/40 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
                  <GraduationCap size={14} className="text-white" />
                </div>
                <span className="font-bold text-white text-sm">Attendy Edu</span>
              </div>
              <p className="text-xs text-white/30 max-w-xs leading-relaxed">
                QR attendance for Nigerian schools. One scan. Instant notification. Complete record.
              </p>
              <p className="text-xs text-white/20 mt-3">🇳🇬 Proudly Nigerian · Built for Africa</p>
            </div>

            <div className="flex gap-12 text-sm">
              <div>
                <p className="text-white/20 text-xs uppercase tracking-widest font-semibold mb-3">Product</p>
                <div className="space-y-2">
                  <a href="#features" className="block text-white/40 hover:text-green-400 text-xs transition-colors">Features</a>
                  <a href="#pricing" className="block text-white/40 hover:text-green-400 text-xs transition-colors">Pricing</a>
                  <a href="#faq" className="block text-white/40 hover:text-green-400 text-xs transition-colors">FAQ</a>
                </div>
              </div>
              <div>
                <p className="text-white/20 text-xs uppercase tracking-widest font-semibold mb-3">Access</p>
                <div className="space-y-2">
                  <a href="/portal" className="block text-white/40 hover:text-green-400 text-xs transition-colors">Parent Portal</a>
                  <button onClick={() => setShowSchoolLogin(true)} className="block text-white/40 hover:text-green-400 text-xs transition-colors">Staff Login</button>
                  <a href="https://attendy-web.vercel.app" className="block text-white/40 hover:text-green-400 text-xs transition-colors">Attendy Main</a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-green-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/20">
            <p>© 2026 Attendy. All rights reserved.</p>
            <p>Powered by Supabase · Termii</p>
          </div>
        </div>
      </footer>

      {/* ── Floating WhatsApp button ── */}
      <a
        href="https://wa.me/2348077291745?text=Hi%2C%20I%20want%20to%20set%20up%20Attendy%20for%20my%20school"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-2xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-green-900/50"
        style={{ boxShadow: "0 8px 24px rgba(34,197,94,0.35)" }}
      >
        <MessageCircle size={18} />
        <span className="text-sm font-semibold hidden sm:inline">WhatsApp us</span>
      </a>

      {/* ── School Login Modal ── */}
      {showSchoolLogin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowSchoolLogin(false)}
        >
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
              <button
                onClick={() => setShowSchoolLogin(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40"
              >
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
                <p className="text-xs text-white/25 mt-1.5">Provided by your school admin when signing up with Attendy</p>
              </div>
              {slugError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {slugError}
                </div>
              )}
              <button
                type="submit"
                disabled={checking || !slug.trim()}
                className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {checking ? (
                  <><Loader2 size={15} className="animate-spin" />Checking…</>
                ) : (
                  <>Continue to Login <ArrowRight size={15} /></>
                )}
              </button>
            </form>
            <p className="text-center text-xs text-white/30 mt-5">
              Parent?{" "}
              <a href="/portal" className="text-green-400 hover:underline">
                Use the Parent Portal →
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}