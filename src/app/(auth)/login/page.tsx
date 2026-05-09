"use client";
import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2, Search, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

function SchoolEntryForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase();
    if (!s) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`/api/check-org?slug=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (!res.ok || !data.exists) { setError("School not found. Double-check your school ID with your admin."); setChecking(false); return; }
      if (data.suspended) { setError("This school account is currently suspended. Contact Attendy support."); setChecking(false); return; }
      if (data.expired) { setError("This school's subscription has expired. Contact your school admin."); setChecking(false); return; }
      router.push(`/${s}/login`);
    } catch { setError("Something went wrong. Please try again."); setChecking(false); }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 shadow-lg shadow-green-500/30 mb-4">
          <GraduationCap size={30} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendy Edu</h1>
        <p className="text-sm text-slate-500 dark:text-[#6b9e7a] mt-1">Enter your school ID to continue</p>
      </div>
      <div className="card p-8 shadow-xl shadow-green-500/5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">School ID</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="slug" type="text" value={slug}
                onChange={e => { setSlug(e.target.value); setError(null); }}
                placeholder="e.g. greenfield-academy" required autoComplete="off" className="input-base pl-9" />
            </div>
            <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-1.5">Your school ID is provided by your admin when you sign up with Attendy.</p>
          </div>
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400">{error}</div>}
          <button type="submit" disabled={checking || !slug.trim()} className={cn("btn-primary w-full py-3", checking && "opacity-75")}>
            {checking ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : <><ArrowRight size={16} /> Continue to Login</>}
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 dark:text-[#4a7a5a] mt-6">
          Parent? <a href="/portal" className="text-green-600 dark:text-green-400 hover:underline font-medium">Use the Parent Portal</a>
        </p>
      </div>
      <p className="text-center text-xs text-slate-400 dark:text-[#4a7a5a] mt-6">Powered by Attendy · Built for Nigerian Schools</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
      <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="flex justify-center"><Loader2 size={28} className="animate-spin text-green-500" /></div>}>
          <SchoolEntryForm />
        </Suspense>
      </div>
    </div>
  );
}