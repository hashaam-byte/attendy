"use client";
// src/app/landing-page.tsx — ATTENDY-EDU public landing page

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, QrCode, Bell, BarChart3, Users, CheckCircle,
  ArrowRight, Shield, Smartphone, Zap, Search, Loader2, Phone,
} from "lucide-react";

const FEATURES = [
  { icon: QrCode, title: "QR Gate Scanning", desc: "Students scan in under 2 seconds. Works on any ₦30,000 Android. No app required.", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  { icon: Bell, title: "Instant Parent SMS", desc: "Parents get an SMS the moment their child arrives — or an alert if they're absent.", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { icon: BarChart3, title: "Attendance Reports", desc: "Daily, weekly, and term reports. PDF exports. Class comparisons. Eligibility tracking.", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { icon: Users, title: "Multi-Role Access", desc: "Admins, teachers, gatemen each see only what they need. Parent portal included.", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
  { icon: Shield, title: "Offline Mode", desc: "Scans queue locally when internet is patchy. Everything syncs when you reconnect.", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
  { icon: Smartphone, title: "QR Card Designer", desc: "Design and print student ID cards with school logo and colours. Download as PNG.", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
];

const STEPS = [
  { n: "1", title: "Register Students", desc: "Add students via CSV bulk upload or one by one. QR cards are generated automatically." },
  { n: "2", title: "Scan at the Gate", desc: "Gateman opens the scanner on any phone or tablet. Students scan their QR card." },
  { n: "3", title: "Parents Are Notified", desc: "An SMS goes to the parent's phone within seconds — arrival time, late status, all included." },
];

export default function LandingPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [checking, setChecking] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

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
        setSlugError("School not found. Double-check your school ID with your admin.");
        setChecking(false);
        return;
      }
      if (data.suspended) {
        setSlugError("This school account is currently suspended. Contact Attendy support.");
        setChecking(false);
        return;
      }
      if (data.expired) {
        setSlugError("This school's subscription has expired. Contact your school admin.");
        setChecking(false);
        return;
      }
      router.push(`/login?school=${encodeURIComponent(s)}`);
    } catch {
      setSlugError("Something went wrong. Please try again.");
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">

      {/* Nav */}
      <nav className="border-b border-[#bbf7d0] dark:border-[#1a3a24] bg-white/80 dark:bg-[#0c1a12]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
              <GraduationCap size={17} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-lg">Attendy Edu</span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-semibold uppercase tracking-wide">Schools</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/portal" className="text-sm text-slate-600 dark:text-green-300 hover:text-green-600 dark:hover:text-green-400 transition-colors hidden sm:inline">
              Parent Portal
            </a>
            <a href="/login" className="btn-primary text-sm px-4 py-2">Staff Login</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-[#0a1a0f] dark:via-[#0c1a12] dark:to-[#071410] pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-400/10 rounded-full -translate-y-32 translate-x-32 pointer-events-none blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50 text-xs font-semibold text-green-700 dark:text-green-300 mb-6">
              <Zap size={11} />
              Built for Nigerian Schools
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight mb-5">
              School Attendance
              <span className="block text-green-600 dark:text-green-400">in One Scan</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-[#6b9e7a] mb-10 leading-relaxed">
              Students scan their QR card at the gate. Parents get an SMS in seconds.
              Teachers and admin see everything on one clean dashboard. No paper. No guessing.
            </p>

            {/* School login box */}
            <div className="card p-5 max-w-md">
              <p className="text-sm font-semibold text-slate-700 dark:text-green-200 mb-1">
                Enter your school ID to log in
              </p>
              <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mb-3">
                Your school ID is provided when you sign up with Attendy
              </p>
              <form onSubmit={handleSchoolLogin} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input-base pl-8 text-sm" placeholder="e.g. greenfield-academy"
                    value={slug} onChange={(e) => { setSlug(e.target.value); setSlugError(null); }} required />
                </div>
                <button type="submit" disabled={checking || !slug.trim()} className="btn-primary whitespace-nowrap text-sm">
                  {checking ? <Loader2 size={14} className="animate-spin" /> : <><ArrowRight size={14} /> Go</>}
                </button>
              </form>
              {slugError && <p className="text-xs text-red-500 mt-2">{slugError}</p>}
            </div>

            {/* Or contact */}
            <p className="text-sm text-slate-400 dark:text-[#4a7a5a] mt-4 flex items-center gap-2">
              <Phone size={13} />
              Don't have a school ID?{" "}
              <a href="https://wa.me/2348077291745" target="_blank" rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:underline font-medium">
                Contact Attendy on WhatsApp
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white dark:bg-[#0c1a12]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">How it works</h2>
            <p className="text-slate-500 dark:text-[#6b9e7a]">Up and running in an afternoon. No hardware to install.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">{n}</div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-[#6b9e7a] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Everything your school needs</h2>
            <p className="text-slate-500 dark:text-[#6b9e7a]">One platform. No add-ons.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="card p-5 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${bg}`}>
                  <Icon size={18} className={color} />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1.5">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-[#6b9e7a] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-green-600">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to modernise your school?</h2>
          <p className="text-green-100 mb-8">Contact Attendy to get set up. Free trial for 30 days.</p>
          <a href="https://wa.me/2348077291745?text=Hi%2C%20I%20want%20to%20set%20up%20Attendy%20for%20my%20school"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors shadow-lg">
            Chat with us on WhatsApp <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[#bbf7d0] dark:border-[#1a3a24] bg-white dark:bg-[#0c1a12]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400 dark:text-[#4a7a5a]">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-green-500" />
            <span>Attendy Edu · Built for Nigerian Schools</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="/portal" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Parent Portal</a>
            <a href="/login" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Staff Login</a>
          </div>
        </div>
      </footer>

    </div>
  );
}