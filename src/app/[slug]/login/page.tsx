"use client";
// ATTENDY-EDU Login Page — src/app/[slug]/login/page.tsx
// Aesthetic: dark glass, single accent color, one typeface. Same visual family
// as before (deep background, glass card, primary-color glow) — just quieter:
// no scanlines, no grid overlay, no floating data chips, no terminal copy.

import { use, useState, useEffect, Suspense, ReactNode } from "react";
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

interface LogoMarkProps {
  primaryColor: string;
  logoUrl: string | null;
  name: string | null;
  loading: boolean;
}

interface GlassInputProps {
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  autoComplete?: string;
  icon?: ReactNode;
  suffix?: ReactNode;
  primaryColor: string;
}

interface LoginFormProps {
  slug: string;
}

// ── Background: one soft gradient, no grid, no scanline ───────────

function Background({ primaryColor = "#16a34a" }: { primaryColor?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${primaryColor}14 0%, transparent 60%),
                       linear-gradient(160deg, #0a0f0c 0%, #0d1310 45%, #0a0f0c 100%)`,
        }}
      />
      <div
        className="absolute rounded-full blur-3xl opacity-[0.08]"
        style={{
          width: 420,
          height: 420,
          bottom: "-12%",
          right: "-8%",
          background: primaryColor,
        }}
      />
    </div>
  );
}

// ── Logo mark: simple glass tile with soft ring, no spin/corners ──

function LogoMark({ primaryColor, logoUrl, name, loading }: LogoMarkProps) {
  return (
    <div
      className="relative flex items-center justify-center rounded-2xl overflow-hidden"
      style={{
        width: 60,
        height: 60,
        background: logoUrl ? "rgba(255,255,255,0.05)" : `${primaryColor}18`,
        backdropFilter: "blur(12px)",
        border: `1px solid ${primaryColor}25`,
        boxShadow: `0 8px 24px ${primaryColor}18`,
      }}
    >
      {loading ? (
        <div
          className="w-full h-full"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05)`,
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      ) : logoUrl ? (
        <Image src={logoUrl} alt={name ?? ""} width={52} height={52} className="object-contain p-1.5" />
      ) : (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M3 3h7v7H3z" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 3h7v7h-7z" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 14h7v7H3z" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="16" y="16" width="3" height="3" fill={primaryColor} />
        </svg>
      )}
    </div>
  );
}

// ── Glass input ───────────────────────────────────────────────────

function GlassInput({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  icon,
  suffix,
  primaryColor,
}: GlassInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className="relative rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: focused ? `${primaryColor}06` : "rgba(255,255,255,0.03)",
        border: `1px solid ${focused ? primaryColor + "45" : "rgba(255,255,255,0.08)"}`,
        boxShadow: focused ? `0 0 0 3px ${primaryColor}12` : "none",
      }}
    >
      {icon && (
        <div
          className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
          style={{ color: focused ? primaryColor : "rgba(255,255,255,0.3)" }}
        >
          {icon}
        </div>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full bg-transparent text-[15px] outline-none"
        style={{
          padding: "12.5px 16px",
          paddingLeft: icon ? "42px" : "16px",
          paddingRight: suffix ? "44px" : "16px",
          color: "rgba(255,255,255,0.92)",
        }}
      />
      {suffix && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{suffix}</div>}
    </div>
  );
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
            primaryColor: d.primaryColor ?? "#16a34a",
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

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

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

  const primaryColor = orgInfo?.primaryColor ?? "#16a34a";
  const canSubmit = email.length > 0 && password.length > 0 && !loading;

  const EmailIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 7l10 7 10-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  const LockIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes shimmer {
          0%   { opacity: 0.3; }
          50%  { opacity: 0.7; }
          100% { opacity: 0.3; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .card-appear   { animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .card-appear-1 { animation-delay: 0.05s; }
        .card-appear-2 { animation-delay: 0.1s; }

        input::placeholder { color: rgba(255,255,255,0.22) !important; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px transparent inset !important;
          -webkit-text-fill-color: rgba(255,255,255,0.9) !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <Background primaryColor={primaryColor} />

      {/* Top nav */}
      <div className="relative z-20 flex items-center justify-between px-6 py-5" style={{ animation: "fadeIn 0.4s ease both" }}>
        <Link
          href="/"
          className="group flex items-center gap-2 text-sm font-medium transition-colors duration-200"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:-translate-x-1">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="group-hover:text-white transition-colors">Attendy</span>
        </Link>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Logo + school name */}
          <div className="card-appear card-appear-1 flex flex-col items-center mb-7">
            <LogoMark
              primaryColor={primaryColor}
              logoUrl={orgInfo?.logoUrl ?? null}
              name={orgInfo?.name ?? null}
              loading={fetchingOrg}
            />

            <div className="mt-4 text-center">
              {fetchingOrg ? (
                <div className="space-y-2">
                  <div className="h-5 w-40 rounded-lg mx-auto" style={{ background: "rgba(255,255,255,0.06)", animation: "shimmer 1.5s infinite" }} />
                  <div className="h-3 w-24 rounded-lg mx-auto" style={{ background: "rgba(255,255,255,0.04)", animation: "shimmer 1.5s infinite" }} />
                </div>
              ) : (
                <>
                  <h1 className="font-semibold text-lg" style={{ color: "rgba(255,255,255,0.95)" }}>
                    {orgInfo?.name ?? "School Portal"}
                  </h1>
                  <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Sign in to your account
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Card */}
          <div
            className="card-appear card-appear-2 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.035)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div className="p-7">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-[13px] font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                    Email
                  </label>
                  <GlassInput
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`you@${slug}.edu.ng`}
                    required
                    autoComplete="email"
                    primaryColor={primaryColor}
                    icon={EmailIcon}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-[13px] font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                    Password
                  </label>
                  <GlassInput
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    primaryColor={primaryColor}
                    icon={LockIcon}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        style={{ color: "rgba(255,255,255,0.3)" }}
                        className="hover:text-white transition-colors p-0.5"
                      >
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                  />
                </div>

                {error && (
                  <div
                    className="flex items-start gap-2.5 p-3 rounded-xl text-[13px]"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "rgba(248,113,113,0.9)",
                      animation: "slideUp 0.3s ease",
                    }}
                  >
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 mt-1"
                  style={{
                    background: canSubmit ? primaryColor : "rgba(255,255,255,0.06)",
                    color: canSubmit ? "white" : "rgba(255,255,255,0.25)",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Signing in
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </span>
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
              </div>

              {/* Role info */}
              <p className="text-[13px] text-center leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                For Admin, Teacher &amp; Gateman roles.
                <br />
                Looking for the{" "}
                <Link href="/portal" style={{ color: primaryColor }} className="font-medium hover:underline">
                  Parent Portal
                </Link>
                ?
              </p>
            </div>

            {/* Footer strip */}
            <div
              className="px-7 py-3 flex items-center justify-between border-t"
              style={{ background: "rgba(0,0,0,0.15)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <Link href="/" className="text-xs transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.3)" }}>
                ← Not your school?
              </Link>
              <Link href="/portal" className="text-xs transition-colors hover:opacity-100" style={{ color: primaryColor, opacity: 0.75 }}>
                Parent Portal
              </Link>
            </div>
          </div>

          {/* Page footer */}
          <p
            className="card-appear text-center text-xs mt-6"
            style={{ color: "rgba(255,255,255,0.2)", animationDelay: "0.35s" }}
          >
            Attendy · Built for Nigerian schools
          </p>
        </div>
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
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f0c" }}>
          <Loader2 size={22} className="animate-spin" style={{ color: "#16a34a" }} />
        </div>
      }
    >
      <LoginForm slug={slug} />
    </Suspense>
  );
}