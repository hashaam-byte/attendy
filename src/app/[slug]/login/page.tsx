"use client";
// ATTENDY-EDU Login Page — src/app/[slug]/login/page.tsx
// Aesthetic: minimal, quiet, confident. Apple / Samsung-style calm.
// Same data flow and auth logic as before — only the visual layer changed.

import { use, useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────

type OrgInfo = {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
} | null;

interface LoginFormProps {
  slug: string;
}

// ── Main login form ───────────────────────────────────────────────

function LoginForm({ slug }: LoginFormProps) {
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
    fetch(`/api/check-org?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(
        (d: {
          exists: boolean;
          suspended?: boolean;
          expired?: boolean;
          name?: string;
          logoUrl?: string | null;
          primaryColor?: string;
        }) => {
          if (!d.exists) {
            router.replace(`/not-found-org?slug=${encodeURIComponent(slug)}`);
            return;
          }
          if (d.suspended) {
            router.replace(`/suspended?slug=${encodeURIComponent(slug)}`);
            return;
          }
          if (d.expired) {
            router.replace(`/expired?slug=${encodeURIComponent(slug)}`);
            return;
          }
          setOrgInfo({
            name: d.name ?? slug,
            logoUrl: d.logoUrl ?? null,
            primaryColor: d.primaryColor ?? "#0071e3",
          });
        }
      )
      .catch(() => setError("Could not verify school. Check your connection."))
      .finally(() => setFetchingOrg(false));
  }, [slug, router]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Invalid credentials. Double-check and try again.");
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
      setError("Account not linked to any school. Contact your admin.");
      setLoading(false);
      return;
    }

    const org = Array.isArray(orgUser.organisations)
      ? (orgUser.organisations[0] as { industry: string; is_active: boolean; slug: string } | null)
      : (orgUser.organisations as { industry: string; is_active: boolean; slug: string } | null);

    if (org?.industry !== "education") {
      await supabase.auth.signOut();
      setError("This portal is for schools only.");
      setLoading(false);
      return;
    }
    if (!org?.is_active) {
      await supabase.auth.signOut();
      setError("School account suspended. Contact Attendy.");
      setLoading(false);
      return;
    }
    if (org?.slug !== slug) {
      await supabase.auth.signOut();
      setError("This account belongs to a different school.");
      setLoading(false);
      return;
    }

    if (orgUser.role === "gateman") {
      router.push(`/${slug}/scanner`);
    } else {
      router.push(`/${slug}/dashboard`);
    }
    router.refresh();
  }

  const primaryColor = orgInfo?.primaryColor ?? "#0071e3";
  const canSubmit = email.length > 0 && password.length > 0 && !loading;

  return (
    <div
      className="min-h-screen flex flex-col bg-white"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulseSoft {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.1s; }
        .fade-in { animation: fadeIn 0.4s ease both; }

        input::placeholder { color: #adb0b8; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px white inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* Top nav */}
      <div className="fade-in flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/"
          className="text-[15px] font-semibold text-neutral-900 tracking-tight"
        >
          Attendy
        </Link>
        <span className="text-[13px] text-neutral-400">Need help? Contact support</span>
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[360px]">
          {/* Logo + school name */}
          <div className="fade-up fade-up-1 flex flex-col items-center mb-9">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden mb-4"
              style={{
                background: fetchingOrg ? "#f2f2f4" : orgInfo?.logoUrl ? "#f7f7f8" : `${primaryColor}12`,
                animation: fetchingOrg ? "pulseSoft 1.4s ease-in-out infinite" : undefined,
              }}
            >
              {!fetchingOrg && orgInfo?.logoUrl && (
                <Image
                  src={orgInfo.logoUrl}
                  alt={orgInfo.name}
                  width={56}
                  height={56}
                  className="object-contain p-2"
                />
              )}
              {!fetchingOrg && !orgInfo?.logoUrl && (
                <span
                  className="text-lg font-semibold"
                  style={{ color: primaryColor }}
                >
                  {(orgInfo?.name ?? slug).charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {fetchingOrg ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-5 w-40 rounded-md bg-neutral-100" style={{ animation: "pulseSoft 1.4s ease-in-out infinite" }} />
                <div className="h-3 w-24 rounded-md bg-neutral-100" style={{ animation: "pulseSoft 1.4s ease-in-out infinite" }} />
              </div>
            ) : (
              <>
                <h1 className="text-[19px] font-semibold text-neutral-900 text-center tracking-tight">
                  {orgInfo?.name ?? "School Portal"}
                </h1>
                <p className="text-[13px] text-neutral-400 mt-1">Sign in to continue</p>
              </>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="fade-up fade-up-2 space-y-3">
            <div>
              <label
                htmlFor="email"
                className="block text-[13px] font-medium text-neutral-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`you@${slug}.edu.ng`}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-[15px] text-neutral-900 outline-none transition-all focus:border-neutral-300"
                style={{
                  boxShadow: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 3.5px ${primaryColor}1f`;
                  e.currentTarget.style.borderColor = primaryColor;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "";
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-neutral-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-neutral-200 px-3.5 py-3 pr-11 text-[15px] text-neutral-900 outline-none transition-all"
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 3.5px ${primaryColor}1f`;
                    e.currentTarget.style.borderColor = primaryColor;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13px]"
                style={{ background: "#fef2f2", color: "#b91c1c" }}
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl py-3 text-[15px] font-medium text-white transition-all disabled:cursor-not-allowed"
              style={{
                background: canSubmit ? primaryColor : "#d4d4d8",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Signing in
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="fade-up fade-up-2 flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-neutral-100" />
            <span className="text-[12px] text-neutral-400">or</span>
            <div className="flex-1 h-px bg-neutral-100" />
          </div>

          {/* Role helper */}
          <p className="fade-up fade-up-2 text-center text-[13px] text-neutral-400 leading-relaxed">
            For Admin, Teacher &amp; Gateman accounts.
            <br />
            Looking for the{" "}
            <Link href="/portal" className="font-medium" style={{ color: primaryColor }}>
              Parent Portal
            </Link>
            ?
          </p>

          {/* Wrong school */}
          <div className="fade-up fade-up-2 text-center mt-6">
            <Link
              href="/"
              className="text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              ← Not your school?
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fade-in text-center pb-6 text-[12px] text-neutral-300">
        Attendy · Built for Nigerian schools
      </div>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────

export default function SlugLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 size={22} className="animate-spin text-neutral-300" />
        </div>
      }
    >
      <LoginForm slug={slug} />
    </Suspense>
  );
}