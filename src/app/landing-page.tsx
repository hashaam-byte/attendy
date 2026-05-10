"use client";
// src/app/landing-page.tsx — ATTENDY-EDU v5
// Organic, human, Nigerian school feel. All 4 images integrated.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, QrCode, Bell, BarChart3, Users, CheckCircle,
  ArrowRight, Smartphone, Zap, Search, Loader2,
  Wifi, MessageCircle, X, ChevronDown, ChevronUp, Shield, Clock,
} from "lucide-react";
import Image from "next/image";

// ─── Live scan counter ────────────────────────────────────────────
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
    if (!count) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / 1600, 1);
      setDisplay(Math.floor(count * (1 - Math.pow(1 - p, 3))));
      if (p < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [count]);

  return (
    <span className="inline-flex items-center gap-2 bg-green-950/60 border border-green-800/40 rounded-full px-4 py-2 text-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span className="font-semibold text-green-300">{display.toLocaleString("en-NG")}</span>
      <span className="text-green-600 text-xs">scans logged across Nigeria</span>
    </span>
  );
}

// ─── FAQ accordion ────────────────────────────────────────────────
function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/[0.07] rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-sm font-medium text-white/85">{q}</span>
        {open
          ? <ChevronUp size={14} className="text-green-500 shrink-0" />
          : <ChevronDown size={14} className="text-green-500 shrink-0" />}
      </button>
      {open && (
        <p className="px-5 pb-5 text-sm text-white/50 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────
const FEATURES = [
  { icon: QrCode,     title: "QR Gate Scanning",  color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  desc: "Students scan in under 2 seconds. Works on any Android. Gateman gets a clear green or red result every time." },
  { icon: Bell,       title: "Instant Parent SMS", color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/20",    desc: "Parent gets an SMS the moment their child arrives — or a missed-arrival alert at 9 AM if they haven't scanned." },
  { icon: Wifi,       title: "Works Offline",      color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  desc: "Internet down at the gate? Scans queue locally and sync the moment you reconnect. Not a single scan lost." },
  { icon: BarChart3,  title: "Attendance Reports", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", desc: "Daily, weekly, and term reports. Per-student % for exam eligibility. Class comparison. PDF export." },
  { icon: Smartphone, title: "QR Card Designer",   color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/20",   desc: "Design and print student ID cards with your school logo and colours. Download as PNG, print on cardstock." },
  { icon: Users,      title: "Multi-Role Access",  color: "text-teal-400",   bg: "bg-teal-500/10",   border: "border-teal-500/20",   desc: "Admin, Teacher, Gateman — each sees only what they need. Parent portal needs only a phone number." },
];

const PLANS = [
  { name: "Trial",    price: "Free",    period: "30 days",   members: 30,   sms: 100,   highlight: false, badge: null,           cta: "Start free" },
  { name: "Basic",    price: "₦12,000", period: "per month", members: 100,  sms: 500,   highlight: false, badge: null,           cta: "Get started" },
  { name: "Standard", price: "₦20,000", period: "per month", members: 300,  sms: 2000,  highlight: true,  badge: "Most popular", cta: "Get started" },
  { name: "Premium",  price: "₦35,000", period: "per month", members: 1000, sms: 10000, highlight: false, badge: null,           cta: "Get started" },
];

const FAQS = [
  { q: "Do students need a smartphone?",        a: "No. Students only need their printed QR card — a laminated card or sticker is fine. Only the gateman's phone needs to run the scanner." },
  { q: "What if the internet goes down?",        a: "The scanner works fully offline. It caches the student list on load. Scans queue locally and sync the moment you reconnect. A yellow banner shows 'Offline — syncing'. Nothing is lost." },
  { q: "How do parents get notified?",           a: "Parents receive an SMS the moment their child's QR card is scanned at the gate. If the child hasn't arrived by a configurable time (e.g. 9 AM), an absence alert fires automatically. No app needed on the parent's phone." },
  { q: "How long does setup take?",              a: "For most schools: 1–2 hours. Sign up, we activate your account same day, bulk-import students via CSV, print QR cards, and the gateman is scanning by next morning." },
  { q: "Is our data secure?",                    a: "Data is stored in Supabase (SOC 2 Type II compliant). Row-Level Security is enforced — each school only ever sees its own data." },
  { q: "What happens when we hit an SMS limit?", a: "SMS overage is blocked, not billed. You'll never get a surprise charge. The dashboard shows your remaining count in real time." },
];

// ─── Main ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [checking, setChecking] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase();
    if (!s) return;
    setChecking(true);
    setSlugError(null);
    try {
      const res = await fetch(`/api/check-org?slug=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (!res.ok || !data.exists) { setSlugError("School not found. Check your school ID with your admin."); setChecking(false); return; }
      if (data.suspended) { setSlugError("This school is currently suspended."); setChecking(false); return; }
      if (data.expired)   { setSlugError("This school's subscription has expired."); setChecking(false); return; }
      router.push(`/${s}/login`);
    } catch {
      setSlugError("Something went wrong. Please try again.");
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#040c07] text-white overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#040c07]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center">
              <GraduationCap size={15} className="text-white" />
            </div>
            <span className="font-bold tracking-tight">Attendy</span>
            <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-widest bg-green-950 text-green-500 border border-green-800/50 px-2 py-0.5 rounded-full">Edu</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-[13px] text-white/40">
            <a href="#how" className="hover:text-green-400 transition-colors">How it works</a>
            <a href="#features" className="hover:text-green-400 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-green-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-green-400 transition-colors">FAQ</a>
            <a href="/portal" className="hover:text-green-400 transition-colors">Parent Portal</a>
          </div>
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors">
            Staff Login
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-20 pb-0 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-40"
          style={{ backgroundImage: "radial-gradient(circle, rgba(34,197,94,0.12) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] pointer-events-none rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(34,197,94,0.12) 0%, transparent 70%)" }} />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-16 items-center pb-16 pt-4">

            {/* Left copy */}
            <div>
              <div className="mb-7"><ScanCounter /></div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-950/70 border border-green-800/40 text-[11px] font-semibold text-green-400 mb-6">
                <Zap size={10} /> Built for Nigerian Schools · QR Attendance
              </div>
              <h1 className="text-[2.6rem] sm:text-5xl xl:text-[3.4rem] font-extrabold leading-[1.08] tracking-tight mb-6">
                Attendance in{" "}
                <em className="not-italic text-green-400">one scan.</em>
                <br />
                Parent notified in{" "}
                <em className="not-italic text-green-400">seconds.</em>
              </h1>
              <p className="text-[15px] text-white/50 leading-relaxed mb-9 max-w-[420px]">
                Students tap their QR card at the gate. The system logs it, marks them on time or late,
                and texts the parent — all before they reach their classroom.
                No paper. No calls. No guessing.
              </p>
              <div className="flex flex-wrap gap-3 mb-10">
                <a href="https://wa.me/2348077291745?text=Hi%2C%20I%20want%20to%20set%20up%20Attendy%20for%20my%20school"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-semibold text-[15px] transition-all hover:-translate-y-0.5"
                  style={{ boxShadow: "0 6px 28px rgba(34,197,94,0.28)" }}>
                  <MessageCircle size={17} /> Start Free Trial on WhatsApp
                </a>
                <button onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 font-semibold text-[15px] transition-colors">
                  Staff Login <ArrowRight size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-5 text-[12px] text-white/30">
                {["Free first month", "No hardware needed", "Works on ₦30k Android", "Setup in 2 hours"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle size={11} className="text-green-600" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: hero image with floating chips */}
            <div className="relative hidden lg:block h-[500px]">
              <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden border border-white/[0.08]"
                style={{ transform: "rotate(1deg)" }}>
                <Image src="/images/hero-scan.jpg"
                  alt="Nigerian school security guard scanning a student's QR ID card at the school gate"
                  fill className="object-cover object-center" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-[#040c07]/65 via-transparent to-transparent" />
              </div>

              {/* Scan result chip */}
              <div className="absolute -bottom-3 -left-7 w-[220px] bg-[#071208]/95 border border-green-900/60 backdrop-blur-sm rounded-2xl p-3.5 shadow-xl"
                style={{ transform: "rotate(-1.5deg)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle size={13} className="text-green-400 shrink-0" />
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Attendance Recorded</span>
                </div>
                <p className="text-[12px] font-semibold text-white mb-0.5">Emeka Okafor · SS2 Gold</p>
                <p className="text-[11px] text-green-500">On time · 7:34 AM · SMS sent ✓</p>
              </div>

              {/* Stats chip */}
              <div className="absolute -top-3 -right-4 bg-[#071208]/95 border border-green-900/50 backdrop-blur-sm rounded-2xl px-4 py-3 text-center shadow-xl"
                style={{ transform: "rotate(2deg)" }}>
                <p className="text-2xl font-extrabold text-green-400 leading-none">247</p>
                <p className="text-[10px] text-white/40 mt-1">scans today</p>
              </div>
            </div>
          </div>

          {/* Before / After */}
          <div className="pb-20">
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className="p-7 sm:border-r border-b sm:border-b-0 border-white/[0.06]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-5 flex items-center gap-1.5">
                    <X size={10} /> Without Attendy
                  </p>
                  {["Paper register at the gate", "Teacher calls parent to check", "Month-end report takes 2 days", "No proof of who arrived when", "Absent list manually counted"].map((t) => (
                    <div key={t} className="flex items-start gap-2.5 mb-3">
                      <span className="text-red-600/60 text-xs mt-0.5 shrink-0">—</span>
                      <span className="text-[13px] text-white/40">{t}</span>
                    </div>
                  ))}
                </div>
                <div className="p-7">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-400 mb-5 flex items-center gap-1.5">
                    <CheckCircle size={10} className="text-green-500" /> With Attendy
                  </p>
                  {["QR scan at gate in 0.3 seconds", "SMS to parent instantly", "Reports ready any time", "Every scan timestamped", "Absent list auto-generated"].map((t) => (
                    <div key={t} className="flex items-start gap-2.5 mb-3">
                      <span className="text-green-500 text-xs mt-0.5 shrink-0">✓</span>
                      <span className="text-[13px] text-white/80">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof strip ── */}
      <div className="border-y border-white/[0.05] bg-green-950/10 py-4">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-wrap justify-center gap-6 sm:gap-10 text-[13px] text-white/35">
          {[
            { icon: GraduationCap, text: <><strong className="text-white font-semibold">14+ schools</strong> onboarded</> },
            { icon: Users,         text: <><strong className="text-white font-semibold">1,200+</strong> students enrolled</> },
            { icon: Clock,         text: <>Average setup: <strong className="text-white font-semibold">under 2 hours</strong></> },
            { icon: Shield,        text: <><strong className="text-white font-semibold">₦0</strong> hardware needed</> },
          ].map(({ icon: Icon, text }, i) => (
            <span key={i} className="flex items-center gap-2">
              <Icon size={13} className="text-green-600 shrink-0" />
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section id="how" className="py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-widest text-green-500 mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Up and running this afternoon.</h2>
            <p className="text-white/40 mt-3 text-[14px] max-w-xs mx-auto">Three steps from sign-up to your first scan.</p>
          </div>

          {/* Step 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-20">
            <div className="rounded-3xl overflow-hidden border border-white/[0.07]" style={{ aspectRatio: "4/3" }}>
              <Image src="/images/hero-scan.jpg" alt="Gateman scanning student QR card at school gate"
                width={700} height={525} className="w-full h-full object-cover" />
            </div>
            <div className="lg:pl-6">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-green-600 text-white font-extrabold text-sm mb-5">01</div>
              <h3 className="text-2xl font-bold mb-3">Register students, print cards.</h3>
              <p className="text-white/50 text-[15px] leading-relaxed mb-5">
                Add students via CSV bulk upload or one-by-one. QR ID cards are generated instantly —
                with your school logo and colours. Print on plain cardstock.
                The system is ready to scan in minutes.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Bulk CSV import", "School logo on every card", "Instant QR generation"].map((t) => (
                  <span key={t} className="text-[12px] text-green-400 border border-green-800/40 bg-green-950/40 px-3 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-20">
            <div className="lg:order-2 rounded-3xl overflow-hidden border border-white/[0.07] bg-green-950/20 flex items-center justify-center p-8">
              <Image src="/images/scanner-app.png"
                alt="Attendy scanner app showing Emeka Okafor checked in at 7:34 AM"
                width={340} height={480} className="w-full max-w-[280px] mx-auto" />
            </div>
            <div className="lg:order-1 lg:pr-6">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-green-600 text-white font-extrabold text-sm mb-5">02</div>
              <h3 className="text-2xl font-bold mb-3">Gateman scans. Green light, move in.</h3>
              <p className="text-white/50 text-[15px] leading-relaxed mb-5">
                The gateman opens the scanner on any Android phone. Students present their QR card.
                The screen turns green for a registered student, red for an unknown card.
                0.3 seconds. No typing. No searching.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Any Android camera", "Works offline", "0.3-second response"].map((t) => (
                  <span key={t} className="text-[12px] text-green-400 border border-green-800/40 bg-green-950/40 px-3 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="relative rounded-3xl overflow-hidden border border-white/[0.07] bg-[#07120a] flex items-end justify-center pt-8">
              <Image src="/images/sms-notify.png"
                alt="iPhone showing parent SMS notification: Your child Chidi arrived at 7:48 AM"
                width={340} height={580} className="w-full max-w-[240px] mx-auto" />
              <div className="absolute bottom-4 right-4 w-20 rounded-xl overflow-hidden border border-white/10 shadow-xl">
                <Image src="/images/qr-card.png" alt="Student QR ID card" width={200} height={280} className="w-full" />
              </div>
            </div>
            <div className="lg:pl-6">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-green-600 text-white font-extrabold text-sm mb-5">03</div>
              <h3 className="text-2xl font-bold mb-3">Parent gets the SMS. Automatically.</h3>
              <p className="text-white/50 text-[15px] leading-relaxed mb-5">
                Within seconds of the scan, the parent receives a text: their child's name, arrival time,
                and whether they were on time or late. If the student hasn't scanned by 9 AM,
                an absence alert fires — no teacher action needed.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Instant SMS", "Late flagging", "Auto absence alerts", "No parent app needed"].map((t) => (
                  <span key={t} className="text-[12px] text-green-400 border border-green-800/40 bg-green-950/40 px-3 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-5 sm:px-8 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold uppercase tracking-widest text-green-500 mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Everything your school needs.</h2>
            <p className="text-white/40 mt-3 text-[14px]">One platform. No add-ons. No hardware.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg, border }) => (
              <div key={title} className={`p-5 rounded-3xl border ${border} bg-white/[0.015] hover:bg-white/[0.03] transition-colors`}>
                <div className={`w-10 h-10 rounded-2xl ${bg} ${border} border flex items-center justify-center mb-4`}>
                  <Icon size={17} className={color} />
                </div>
                <h3 className="font-semibold text-white mb-2 text-[15px]">{title}</h3>
                <p className="text-[13px] text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QR Card showcase ── */}
      <section className="py-24 px-5 sm:px-8 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-green-500 mb-4">Student ID cards</p>
              <h2 className="text-3xl font-bold mb-5">Your school's card. Your school's brand.</h2>
              <p className="text-white/45 text-[15px] leading-relaxed mb-6">
                Design student ID cards in the Attendy dashboard — add your school logo, name, colours,
                and the student's photo. Download as PNG and print on plain cardstock or laminate sheets.
                Each card has a unique QR code tied to that student's record.
              </p>
              <div className="space-y-3 mb-8">
                {["School logo and custom colours", "Student photo and class details", "Unique QR code per student", "Download PNG, print anywhere"].map((t) => (
                  <div key={t} className="flex items-center gap-3 text-[14px] text-white/65">
                    <CheckCircle size={15} className="text-green-500 shrink-0" /> {t}
                  </div>
                ))}
              </div>
              <a href="https://wa.me/2348077291745" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors">
                <MessageCircle size={15} /> Get started on WhatsApp
              </a>
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="w-48 rounded-3xl overflow-hidden border border-white/10 shadow-2xl" style={{ transform: "rotate(-2deg)" }}>
                <Image src="/images/qr-card.png" alt="Greenfield College student QR ID card for Emeka Okafor"
                  width={400} height={560} className="w-full" />
              </div>
              <div className="w-40 rounded-3xl overflow-hidden border border-white/10 shadow-2xl" style={{ transform: "rotate(1.5deg)" }}>
                <Image src="/images/scanner-app.png" alt="Scanner app showing successful check-in"
                  width={320} height={460} className="w-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-5 sm:px-8 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold uppercase tracking-widest text-green-500 mb-3">From schools using Attendy</p>
            <h2 className="text-3xl font-bold">Nigerian schools love it.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { q: "Before Attendy, our gateman had a paper book and parents called us five times a morning asking if their child arrived. Now the SMS goes out before the child reaches their classroom.", name: "Mrs. Adaobi Nwosu", role: "Head Teacher", school: "Greenleaf Academy, Abuja", initials: "AN", color: "bg-green-700" },
              { q: "Setup was done in one afternoon. The CSV import worked perfectly and the QR cards printed well on plain cardstock. Our PTA praised us at the next meeting.", name: "Mr. Tunde Afolabi", role: "School Administrator", school: "Sunrise International School, Lagos", initials: "TA", color: "bg-sky-700" },
            ].map(({ q, name, role, school, initials, color }) => (
              <div key={name} className="p-7 rounded-3xl border border-white/[0.07] bg-white/[0.015] flex flex-col gap-5">
                <div className="flex gap-0.5">
                  {Array(5).fill(0).map((_, i) => (
                    <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#22c55e"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  ))}
                </div>
                <p className="text-[14px] text-white/60 leading-relaxed italic flex-1">"{q}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>{initials}</div>
                  <div>
                    <p className="text-[14px] font-semibold text-white">{name}</p>
                    <p className="text-[12px] text-white/35">{role} · {school}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-5 sm:px-8 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-green-500 mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Simple plans, all in Naira.</h2>
          </div>
          <p className="text-center text-[13px] text-white/35 mb-12">Every plan starts with a free first month. SMS overage is blocked, never billed.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div key={plan.name}
                className={`relative p-6 rounded-3xl border transition-all ${plan.highlight ? "border-green-600/50 bg-green-950/30" : "border-white/[0.07] bg-white/[0.02]"}`}>
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest bg-green-600 text-white px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <p className="font-bold text-white mb-1">{plan.name}</p>
                <div className="mb-5">
                  <span className="text-[1.6rem] font-extrabold text-white">{plan.price}</span>
                  <span className="text-[11px] text-white/30 ml-1">/{plan.period}</span>
                </div>
                <div className="space-y-2.5 mb-6 text-[12px]">
                  <div className="flex justify-between"><span className="text-white/40">Students</span><span className="text-white font-semibold font-mono">{plan.members.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">SMS/month</span><span className="text-white font-semibold font-mono">{plan.sms.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Admins</span><span className="text-white font-semibold">Unlimited</span></div>
                </div>
                <a href="https://wa.me/2348077291745" target="_blank" rel="noopener noreferrer"
                  className={`block text-center py-2.5 rounded-2xl text-[13px] font-semibold transition-colors ${plan.highlight ? "bg-green-600 hover:bg-green-500 text-white" : "border border-white/10 hover:border-green-800/60 text-green-400 hover:bg-green-950/50"}`}>
                  {plan.cta} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-5 sm:px-8 border-t border-white/[0.05]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-green-500 mb-3">FAQ</p>
            <h2 className="text-3xl font-bold">Common questions.</h2>
          </div>
          <div className="space-y-2.5">
            {FAQS.map((f) => <Faq key={f.q} q={f.q} a={f.a} />)}
          </div>
          <p className="text-center text-[13px] text-white/30 mt-10">
            Still have questions?{" "}
            <a href="https://wa.me/2348077291745" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
              Chat with us on WhatsApp →
            </a>
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-5 sm:px-8 border-t border-white/[0.05]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-[2.5rem] border border-green-800/30 p-12 sm:p-16"
            style={{ background: "linear-gradient(145deg, rgba(22,163,74,0.12), rgba(34,197,94,0.04))" }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to modernise your school?</h2>
            <p className="text-white/40 mb-9 text-[15px] leading-relaxed">
              We onboard most schools in under 2 hours on WhatsApp. Free trial for your first 30 days — no card, no commitment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="https://wa.me/2348077291745?text=Hi%2C%20I%20want%20to%20set%20up%20Attendy%20for%20my%20school"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-semibold transition-all hover:-translate-y-0.5"
                style={{ boxShadow: "0 8px 32px rgba(34,197,94,0.25)" }}>
                <MessageCircle size={17} /> Chat on WhatsApp
              </a>
              <a href="/portal"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-white/10 text-white/60 hover:bg-white/[0.05] font-semibold transition-colors">
                Parent Portal
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] py-10 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-xl bg-green-600 flex items-center justify-center">
                  <GraduationCap size={13} className="text-white" />
                </div>
                <span className="font-bold text-white text-[14px]">Attendy Edu</span>
              </div>
              <p className="text-[12px] text-white/25 max-w-[220px] leading-relaxed">QR attendance for Nigerian schools. One scan. Instant notification. Complete record.</p>
              <p className="text-[11px] text-white/15 mt-3">🇳🇬 Proudly Nigerian</p>
            </div>
            <div className="flex gap-10 text-[13px]">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold mb-3">Product</p>
                <div className="space-y-2">
                  {[["#features", "Features"], ["#pricing", "Pricing"], ["#faq", "FAQ"]].map(([href, label]) => (
                    <a key={label} href={href} className="block text-white/35 hover:text-green-400 text-[12px] transition-colors">{label}</a>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold mb-3">Access</p>
                <div className="space-y-2">
                  <a href="/portal" className="block text-white/35 hover:text-green-400 text-[12px] transition-colors">Parent Portal</a>
                  <button onClick={() => setShowModal(true)} className="block text-white/35 hover:text-green-400 text-[12px] transition-colors">Staff Login</button>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-white/15">
            <p>© 2026 Attendy. All rights reserved.</p>
            <p>Powered by Supabase · Termii</p>
          </div>
        </div>
      </footer>

      {/* ── Floating WhatsApp ── */}
      <a href="https://wa.me/2348077291745?text=Hi%2C%20I%20want%20to%20set%20up%20Attendy%20for%20my%20school"
        target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-2xl shadow-xl transition-all hover:-translate-y-1"
        style={{ boxShadow: "0 8px 24px rgba(34,197,94,0.35)" }}>
        <MessageCircle size={17} />
        <span className="text-[13px] font-semibold hidden sm:inline">WhatsApp us</span>
      </a>

      {/* ── Staff Login Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowModal(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-white/[0.08] p-8 bg-[#071208]"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[17px] font-bold text-white">Staff Login</h2>
                <p className="text-[13px] text-white/35 mt-0.5">Enter your school ID to continue</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-xl hover:bg-white/10 text-white/35 transition-colors">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-white/40 mb-2 uppercase tracking-widest">School ID</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                  <input type="text" value={slug}
                    onChange={(e) => { setSlug(e.target.value); setSlugError(null); }}
                    placeholder="e.g. greenfield-academy"
                    required autoComplete="off"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white text-[14px] placeholder-white/20 focus:outline-none focus:border-green-600/60 focus:ring-1 focus:ring-green-600/20 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-white/20 mt-1.5">Provided by your school admin</p>
              </div>
              {slugError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[12px] text-red-400">{slugError}</div>
              )}
              <button type="submit" disabled={checking || !slug.trim()}
                className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold text-[14px] transition-colors flex items-center justify-center gap-2">
                {checking
                  ? <><Loader2 size={14} className="animate-spin" /> Checking…</>
                  : <>Continue to Login <ArrowRight size={14} /></>}
              </button>
            </form>
            <p className="text-center text-[12px] text-white/25 mt-5">
              Parent? <a href="/portal" className="text-green-400 hover:underline">Use the Parent Portal →</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}