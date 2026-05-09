"use client";
// src/app/[slug]/login/page.tsx — ATTENDY-EDU
// School-specific login page at /<slug>/login
// e.g. attendy-edu.vercel.app/greenfield-academy/login

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, GraduationCap, QrCode, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

type OrgInfo = { name: string } | null;

function LoginForm({ slug }: { slug: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgInfo, setOrgInfo] = useState<OrgInfo>(null);
  const [fetchingOrg, setFetchingOrg] = useState(true);

  useEffect(() => {
    setFetchingOrg(true);
    fetch(`/api/check-org?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => {
        if (!d.exists) { router.replace(`/not-found-org?slug=${encodeURIComponent(slug)}`); return; }
        if (d.suspended) { router.replace(`/suspended?slug=${encodeURIComponent(slug)}`); return; }
        if (d.expired) { router.replace(`/expired?slug=${encodeURIComponent(slug)}`); return; }
        setOrgInfo({ name: d.name });
      })
      .catch(() => setError("Could not verify school. Check your connection."))
      .finally(() => setFetchingOrg(false));
  }, [slug]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Wrong email or password. Please try again.");
      setLoading(false);
      return;
    }

    const { data: orgUser } = await supabase
      .from("org_users")
      .select("role, organisation_id, organisations(industry, is_active, slug)")
      .eq("user_id", data.user.id)
      .eq("is_active", true)
      .single();

    if (!orgUser) {
      await supabase.auth.signOut();
      setError("Your account is not linked to any school. Contact your school admin.");
      setLoading(false);
      return;
    }

    const org = orgUser.organisations as any;

    if (org?.industry !== "education") {
      await supabase.auth.signOut();
      setError("This portal is for schools only.");
      setLoading(false);
      return;
    }

    if (!org?.is_active) {
      await supabase.auth.signOut();
      setError("Your school account has been suspended. Contact Attendy support.");
      setLoading(false);
      return;
    }

    // Verify this user belongs to THIS slug
    if (org?.slug !== slug) {
      await supabase.auth.signOut();
      setError("This account does not belong to this school. Use your own school's login page.");
      setLoading(false);
      return;
    }

    if (orgUser.role === "gateman") {
      router.push("/scanner");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  if (fetchingOrg) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <Loader2 size={28} className="animate-spin text-green-500" />
        <p className="text-sm text-slate-500 dark:text-[#6b9e7a]">Verifying school…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 shadow-lg shadow-green-500/30 mb-4">
          <GraduationCap size={30} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{orgInfo?.name ?? "School Portal"}</h1>
        <p className="text-sm text-slate-500 dark:text-[#6b9e7a] mt-1">Staff Sign In</p>
        <p className="text-[11px] font-mono text-slate-400 dark:text-[#4a7a5a] mt-1">{slug}</p>
      </div>

      <div className="card p-8 shadow-xl shadow-green-500/5">
        <div className="mb-5 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40">
          <div className="flex items-start gap-2">
            <QrCode size={14} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-xs text-green-700 dark:text-green-300">Sign in as <strong>Admin</strong>, <strong>Teacher</strong>, or <strong>Gateman</strong>.</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">Email address</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder={`admin@${slug}.edu.ng`} required autoComplete="email" className="input-base" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">Password</label>
            <div className="relative">
              <input id="password" type={showPw ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••••"
                required autoComplete="current-password" className="input-base pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-green-300 transition-colors">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !email || !password}
            className={cn("btn-primary w-full py-3", loading && "opacity-75")}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : "Sign in to school portal"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 dark:text-[#4a7a5a] mt-6">
          Parent? <a href="/portal" className="text-green-600 dark:text-green-400 hover:underline font-medium">Use the Parent Portal</a>
        </p>
        <p className="text-center text-xs text-slate-400 dark:text-[#4a7a5a] mt-2">
          Wrong school? <a href="/login" className="text-green-600 dark:text-green-400 hover:underline font-medium">Search again</a>
        </p>
      </div>
      <p className="text-center text-xs text-slate-400 dark:text-[#4a7a5a] mt-6">Powered by Attendy · Built for Nigerian Schools</p>
    </div>
  );
}

export default function SlugLoginPage({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
      <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="flex justify-center"><Loader2 size={28} className="animate-spin text-green-500" /></div>}>
          <LoginForm slug={params.slug} />
        </Suspense>
      </div>
    </div>
  );
}