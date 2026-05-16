"use client";
// Redesigned ATTENDY-EDU Login Page — src/app/[slug]/login/page.tsx
// Aesthetic: Dark tech-organic — deep forest dark, bioluminescent green accents,
// scan-line textures, glass morphism, kinetic typography.

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

interface GridBackgroundProps {
  primaryColor?: string;
}

interface LogoMarkProps {
  primaryColor: string;
  logoUrl: string | null;
  name: string | null;
  loading: boolean;
}

interface DataChipsProps {
  primaryColor: string;
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

// ── Animated background grid ─────────────────────────────────────

function GridBackground({ primaryColor = "#16a34a" }: GridBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${primaryColor}18 0%, transparent 60%),
                       radial-gradient(ellipse 60% 40% at 80% 100%, ${primaryColor}10 0%, transparent 50%),
                       linear-gradient(160deg, #030a05 0%, #060f08 40%, #040c06 100%)`,
        }}
      />

      <div
        className="absolute left-0 right-0 h-px opacity-30"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${primaryColor} 50%, transparent 100%)`,
          animation: "scanLine 4s ease-in-out infinite",
          top: "50%",
        }}
      />

      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke={primaryColor} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div
        className="absolute rounded-full blur-3xl opacity-10"
        style={{
          width: 500,
          height: 500,
          top: "-20%",
          left: "-10%",
          background: primaryColor,
          animation: "pulse 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full blur-3xl opacity-[0.08]"
        style={{
          width: 400,
          height: 400,
          bottom: "-15%",
          right: "-10%",
          background: primaryColor,
          animation: "pulse 10s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}

// ── QR orbit logo mark ────────────────────────────────────────────

function LogoMark({ primaryColor, logoUrl, name, loading }: LogoMarkProps) {
  const corners: [number, number][] = [[-2, -2], [90, -2], [-2, 90], [90, 90]];

  return (
    <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
      <svg
        className="absolute inset-0"
        width="96"
        height="96"
        style={{ animation: "spin 8s linear infinite" }}
      >
        <circle
          cx="48"
          cy="48"
          r="44"
          fill="none"
          stroke={primaryColor}
          strokeWidth="1"
          strokeDasharray="8 6"
          opacity="0.4"
        />
      </svg>

      <div
        className="absolute rounded-full"
        style={{
          inset: 8,
          border: `1px solid ${primaryColor}40`,
          boxShadow: `0 0 20px ${primaryColor}20, inset 0 0 20px ${primaryColor}10`,
        }}
      />

      <div
        className="relative z-10 flex items-center justify-center rounded-2xl overflow-hidden"
        style={{
          width: 56,
          height: 56,
          background: logoUrl ? "rgba(255,255,255,0.05)" : `${primaryColor}20`,
          backdropFilter: "blur(12px)",
          border: `1px solid ${primaryColor}30`,
          boxShadow: `0 8px 32px ${primaryColor}25`,
        }}
      >
        {loading ? (
          <div
            className="w-full h-full rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05)`,
              animation: "shimmer 1.5s ease-in-out infinite",
            }}
          />
        ) : logoUrl ? (
          <Image
            src={logoUrl}
            alt={name ?? ""}
            width={48}
            height={48}
            className="object-contain p-1"
          />
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M3 3h7v7H3z" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 3h7v7h-7z" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 14h7v7H3z" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="16" y="16" width="3" height="3" fill={primaryColor} />
            <rect x="14" y="14" width="2" height="2" fill={primaryColor} opacity="0.5" />
            <rect x="19" y="14" width="2" height="2" fill={primaryColor} opacity="0.5" />
            <rect x="14" y="19" width="2" height="2" fill={primaryColor} opacity="0.5" />
          </svg>
        )}
      </div>

      {corners.map(([x, y], i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 4,
            height: 4,
            left: x,
            top: y,
            background: primaryColor,
            opacity: 0.6,
            boxShadow: `0 0 6px ${primaryColor}`,
          }}
        />
      ))}
    </div>
  );
}

// ── Floating data chips ───────────────────────────────────────────

function DataChips({ primaryColor }: DataChipsProps) {
  const chips: { label: string; val: string; side: "left" | "right"; offset: string }[] = [
    { label: "SECURE PORTAL", val: "256-BIT", side: "left", offset: "25%" },
    { label: "SESSION", val: "ACTIVE", side: "right", offset: "35%" },
  ];

  return (
    <>
      {chips.map(({ label, val, side, offset }, i) => (
        <div
          key={i}
          className="absolute hidden lg:flex items-center gap-2 select-none"
          style={{
            [side]: "5%",
            top: offset,
            animation: `float ${3 + i}s ease-in-out infinite`,
            animationDelay: `${i * 1.5}s`,
          }}
        >
          <div
            className="px-3 py-1.5 rounded-lg text-[10px] font-mono"
            style={{
              background: `${primaryColor}08`,
              border: `1px solid ${primaryColor}20`,
              backdropFilter: "blur(8px)",
              color: `${primaryColor}80`,
              letterSpacing: "0.12em",
            }}
          >
            <span style={{ color: `${primaryColor}50` }}>{label} </span>
            <span style={{ color: primaryColor }}>{val}</span>
          </div>
        </div>
      ))}
    </>
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
      className="relative rounded-xl overflow-hidden transition-all duration-300"
      style={{
        background: focused ? `${primaryColor}06` : "rgba(255,255,255,0.03)",
        border: `1px solid ${focused ? primaryColor + "50" : "rgba(255,255,255,0.08)"}`,
        boxShadow: focused ? `0 0 0 3px ${primaryColor}15, 0 0 20px ${primaryColor}10` : "none",
      }}
    >
      {icon && (
        <div
          className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
          style={{ color: focused ? primaryColor : "rgba(255,255,255,0.25)" }}
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
        className="w-full bg-transparent text-sm outline-none"
        style={{
          padding: "13px 16px",
          paddingLeft: icon ? "42px" : "16px",
          paddingRight: suffix ? "44px" : "16px",
          color: "rgba(255,255,255,0.9)",
          fontFamily: "'DM Mono', 'Courier New', monospace",
        }}
      />

      {suffix && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{suffix}</div>
      )}

      <div
        className="absolute bottom-0 left-0 h-px transition-all duration-300"
        style={{
          width: focused ? "100%" : "0%",
          background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
        }}
      />
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
    setFetchingOrg(true);
    fetch(`/api/check-org?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d: { exists: boolean; suspended?: boolean; expired?: boolean; name?: string; logoUrl?: string | null; primaryColor?: string }) => {
        if (!d.exists) { router.replace(`/not-found-org?slug=${encodeURIComponent(slug)}`); return; }
        if (d.suspended) { router.replace(`/suspended?slug=${encodeURIComponent(slug)}`); return; }
        if (d.expired) { router.replace(`/expired?slug=${encodeURIComponent(slug)}`); return; }
        setOrgInfo({
          name: d.name ?? slug,
          logoUrl: d.logoUrl ?? null,
          primaryColor: d.primaryColor ?? "#16a34a",
        });
      })
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');

        @keyframes scanLine {
          0%   { top: -2px; opacity: 0; }
          5%   { opacity: 0.3; }
          95%  { opacity: 0.3; }
          100% { top: calc(100% + 2px); opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.10; }
          50%      { transform: scale(1.05); opacity: 0.15; }
        }
        @keyframes shimmer {
          0%   { opacity: 0.3; }
          50%  { opacity: 0.7; }
          100% { opacity: 0.3; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .card-appear   { animation: slideUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .card-appear-1 { animation-delay: 0.1s; }
        .card-appear-2 { animation-delay: 0.2s; }
        .card-appear-3 { animation-delay: 0.3s; }
        .card-appear-4 { animation-delay: 0.4s; }

        input::placeholder { color: rgba(255,255,255,0.2) !important; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px transparent inset !important;
          -webkit-text-fill-color: rgba(255,255,255,0.9) !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* Background */}
      <GridBackground primaryColor={primaryColor} />
      <DataChips primaryColor={primaryColor} />

      {/* CRT scanline texture */}
      <div
        className="pointer-events-none absolute inset-0 z-30"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px)",
          backgroundSize: "100% 2px",
        }}
      />

      {/* Top nav strip */}
      <div
        className="relative z-20 flex items-center justify-between px-6 py-4"
        style={{ animation: "fadeIn 0.5s ease both" }}
      >
        <Link
          href="/"
          className="group flex items-center gap-2 text-xs font-mono transition-colors duration-200"
          style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            className="transition-transform group-hover:-translate-x-1"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="group-hover:text-white transition-colors">ATTENDY.EDU</span>
        </Link>

        <div
          className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-1 rounded-full"
          style={{
            background: `${primaryColor}15`,
            border: `1px solid ${primaryColor}30`,
            color: primaryColor,
            letterSpacing: "0.1em",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{
              background: primaryColor,
              boxShadow: `0 0 6px ${primaryColor}`,
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          SECURE
        </div>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">

          {/* Logo + School name */}
          <div className="card-appear card-appear-1 flex flex-col items-center mb-8">
            <LogoMark
              primaryColor={primaryColor}
              logoUrl={orgInfo?.logoUrl ?? null}
              name={orgInfo?.name ?? null}
              loading={fetchingOrg}
            />

            <div className="mt-5 text-center">
              {fetchingOrg ? (
                <div className="space-y-2">
                  <div
                    className="h-5 w-40 rounded-lg mx-auto"
                    style={{ background: "rgba(255,255,255,0.06)", animation: "shimmer 1.5s infinite" }}
                  />
                  <div
                    className="h-3 w-24 rounded-lg mx-auto"
                    style={{ background: "rgba(255,255,255,0.04)", animation: "shimmer 1.5s infinite" }}
                  />
                </div>
              ) : (
                <>
                  <h1
                    className="font-bold tracking-wide text-lg"
                    style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "0.02em" }}
                  >
                    {orgInfo?.name ?? "School Portal"}
                  </h1>
                  <p
                    className="text-xs mt-1 font-mono"
                    style={{ color: primaryColor, letterSpacing: "0.15em", opacity: 0.8 }}
                  >
                    STAFF ACCESS TERMINAL
                  </p>
                  <div
                    className="text-[10px] font-mono mt-1.5 px-2 py-0.5 rounded-full inline-block"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.25)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {slug}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card */}
          <div
            className="card-appear card-appear-2 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {/* Top accent line */}
            <div
              className="h-px w-full"
              style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}60, transparent)` }}
            />

            <div className="p-7">
              {/* Card header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p
                    className="text-xs font-mono uppercase tracking-widest mb-0.5"
                    style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }}
                  >
                    Authentication
                  </p>
                  <p className="text-base font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
                    Sign in
                  </p>
                </div>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${primaryColor}15`,
                    border: `1px solid ${primaryColor}25`,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke={primaryColor} strokeWidth="1.8" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={primaryColor} strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div className="card-appear card-appear-3">
                  <label
                    className="block text-[10px] font-mono uppercase tracking-widest mb-2"
                    style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}
                  >
                    Email address
                  </label>
                  <GlassInput
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`admin@${slug}.edu.ng`}
                    required
                    autoComplete="email"
                    primaryColor={primaryColor}
                    icon={EmailIcon}
                  />
                </div>

                {/* Password */}
                <div className="card-appear card-appear-4">
                  <label
                    className="block text-[10px] font-mono uppercase tracking-widest mb-2"
                    style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}
                  >
                    Password
                  </label>
                  <GlassInput
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    autoComplete="current-password"
                    primaryColor={primaryColor}
                    icon={LockIcon}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        style={{ color: "rgba(255,255,255,0.25)" }}
                        className="hover:text-white transition-colors p-0.5"
                      >
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                  />
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="flex items-start gap-2.5 p-3 rounded-xl text-xs"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "rgba(248,113,113,0.9)",
                      animation: "slideUp 0.3s ease",
                    }}
                  >
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span style={{ fontFamily: "'DM Mono', monospace" }}>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="relative w-full py-3.5 rounded-xl font-semibold text-sm overflow-hidden transition-all duration-300 mt-2"
                  style={{
                    background: canSubmit
                      ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`
                      : "rgba(255,255,255,0.06)",
                    color: canSubmit ? "white" : "rgba(255,255,255,0.2)",
                    border: `1px solid ${canSubmit ? primaryColor + "60" : "rgba(255,255,255,0.06)"}`,
                    boxShadow: canSubmit
                      ? `0 8px 32px ${primaryColor}30, 0 0 0 1px ${primaryColor}20`
                      : "none",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    letterSpacing: "0.03em",
                  }}
                >
                  {canSubmit && (
                    <div
                      className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                      style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)",
                      }}
                    />
                  )}

                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            letterSpacing: "0.1em",
                            fontSize: "11px",
                          }}
                        >
                          AUTHENTICATING
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Access Portal</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M5 12h14M12 5l7 7-7 7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "rgba(255,255,255,0.15)", letterSpacing: "0.1em" }}
                >
                  OR
                </span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              </div>

              {/* Role info chip */}
              <div
                className="rounded-xl p-3 flex items-start gap-2.5"
                style={{
                  background: `${primaryColor}08`,
                  border: `1px solid ${primaryColor}18`,
                }}
              >
                <div
                  className="w-5 h-5 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: `${primaryColor}20` }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke={primaryColor} strokeWidth="2" />
                    <path
                      d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
                      stroke={primaryColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}
                >
                  For{" "}
                  <span style={{ color: primaryColor }}>Admin</span>,{" "}
                  <span style={{ color: primaryColor }}>Teacher</span> &amp;{" "}
                  <span style={{ color: primaryColor }}>Gateman</span> roles.{" "}
                  <a
                    href="/portal"
                    style={{
                      color: primaryColor,
                      textDecoration: "underline",
                      textUnderlineOffset: "2px",
                    }}
                  >
                    Parent Portal →
                  </a>
                </p>
              </div>
            </div>

            {/* Bottom accent line */}
            <div
              className="h-px w-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${primaryColor}20, transparent)`,
              }}
            />

            {/* Footer strip */}
            <div
              className="px-7 py-3 flex items-center justify-between"
              style={{ background: "rgba(0,0,0,0.2)" }}
            >
              <a
                href="/"
                className="text-[10px] font-mono transition-colors hover:text-white"
                style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}
              >
                ← WRONG SCHOOL?
              </a>
              <a
                href="/portal"
                className="text-[10px] font-mono transition-colors hover:opacity-100"
                style={{ color: primaryColor, opacity: 0.7, letterSpacing: "0.08em" }}
              >
                PARENT PORTAL
              </a>
            </div>
          </div>

          {/* Page footer */}
          <p
            className="card-appear text-center text-[10px] mt-6 font-mono"
            style={{
              color: "rgba(255,255,255,0.15)",
              letterSpacing: "0.08em",
              animationDelay: "0.5s",
            }}
          >
            ATTENDY · BUILT FOR NIGERIAN SCHOOLS · 🇳🇬
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
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "#030a05" }}
        >
          <Loader2 size={24} className="animate-spin" style={{ color: "#16a34a" }} />
        </div>
      }
    >
      <LoginForm slug={slug} />
    </Suspense>
  );
}