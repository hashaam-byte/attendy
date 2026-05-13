"use client";
// src/app/[slug]/login/page.tsx — ATTENDY-EDU v3
// Shows org logo + name. Validates slug server-side on load.
// Redirects to /[slug]/dashboard on success.

import { use, useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, GraduationCap, QrCode, AlertCircle, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type OrgInfo = {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
} | null;

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
      .then((r) => r.json())
      .then((d) => {
        if (!d.exists) { router.replace(`/not-found-org?slug=${encodeURIComponent(slug)}`); return; }
        if (d.suspended) { router.replace(`/suspended?slug=${encodeURIComponent(slug)}`); return; }
        if (d.expired) { router.replace(`/expired?slug=${encodeURIComponent(slug)}`); return; }
        setOrgInfo({ name: d.name, logoUrl: d.logoUrl || null, primaryColor: d.primaryColor || "#16a34a" });
      })
      .catch(() => setError("Could not verify school. Check your connection."))
      .finally(() => setFetchingOrg(false));
  }, [slug, router]);

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
      setError("This school account has been suspended. Contact Attendy support.");
      setLoading(false);
      return;
    }

    // ── CRITICAL: Verify user belongs to THIS slug ──
    if (org?.slug !== slug) {
      await supabase.auth.signOut();
      setError(`This account belongs to a different school. Please use your own school's login page.`);
      setLoading(false);
      return;
    }

    // Route based on role
    if (orgUser.role === "gateman") {
      router.push(`/${slug}/scanner`);
    } else {
      router.push(`/${slug}/dashboard`);
    }
    router.refresh();
  }

  const primaryColor = orgInfo?.primaryColor || "#16a34a";

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
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to home
      </Link>

      {/* School branding */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 overflow-hidden"
          style={{ backgroundColor: orgInfo?.logoUrl ? "white" : primaryColor }}
        >
          {orgInfo?.logoUrl ? (
            <Image
              src={orgInfo.logoUrl}
              alt={orgInfo.name}
              width={64}
              height={64}
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <GraduationCap size={30} className="text-white" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {orgInfo?.name ?? "School Portal"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-[#6b9e7a] mt-1">Staff Sign In</p>
        <p className="text-[11px] font-mono text-slate-400 dark:text-[#4a7a5a] mt-1">{slug}</p>
      </div>

      <div className="card p-8 shadow-xl shadow-green-500/5">
        {/* Info banner */}
        <div className="mb-5 p-3 rounded-lg border" style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}>
          <div className="flex items-start gap-2">
            <QrCode size={14} className="shrink-0 mt-0.5" style={{ color: primaryColor }} />
            <p className="text-xs" style={{ color: primaryColor }}>
              Sign in as <strong>Admin</strong>, <strong>Teacher</strong>, or <strong>Gateman</strong>.
              Parents use the <a href="/portal" className="underline font-semibold">Parent Portal</a>.
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`admin@${slug}.edu.ng`}
              required
              autoComplete="email"
              className="input-base"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                autoComplete="current-password"
                className="input-base pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-green-300 transition-colors"
              >
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

          <button
            type="submit"
            disabled={loading || !email || !password}
            className={cn("w-full py-3 rounded-xl font-semibold text-white transition-all", loading && "opacity-75")}
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Signing in…
              </span>
            ) : (
              "Sign in to school portal"
            )}
          </button>
        </form>

        <div className="flex items-center justify-between mt-6 text-xs text-slate-400 dark:text-[#4a7a5a]">
          <a href="/portal" style={{ color: primaryColor }} className="hover:underline font-medium">
            Parent Portal →
          </a>
          <a href="/" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
            Wrong school?
          </a>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 dark:text-[#4a7a5a] mt-6">
        Powered by Attendy · Built for Nigerian Schools
      </p>
    </div>
  );
}

export default function SlugLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params) as { slug: string };

  return (
    <div className="min-h-screen flex flex-col bg-(--bg-base)">
      <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="flex justify-center"><Loader2 size={28} className="animate-spin text-green-500" /></div>}>
          <LoginForm slug={slug} />
        </Suspense>
      </div>
    </div>
  );
}