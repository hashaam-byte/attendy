"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, GraduationCap, QrCode } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Check org membership + role
    const { data: orgUser } = await supabase
      .from("org_users")
      .select("role, organisation_id, organisations(industry, is_active)")
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
      setError("This portal is for schools only. Please use the correct product.");
      setLoading(false);
      return;
    }

    if (!org?.is_active) {
      await supabase.auth.signOut();
      setError("Your school account has been suspended. Contact Attendy support.");
      setLoading(false);
      return;
    }

    // Role-based redirect
    if (orgUser.role === "gateman") {
      router.push("/scanner");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 shadow-lg shadow-green-500/30 mb-4">
              <GraduationCap size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendy Edu</h1>
            <p className="text-sm text-slate-500 dark:text-[#6b9e7a] mt-1">
              School Attendance Management · Sign in to continue
            </p>
          </div>

          {/* Card */}
          <div className="card p-8 shadow-xl shadow-green-500/5">
            {/* Demo hint */}
            <div className="mb-5 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40">
              <div className="flex items-start gap-2">
                <QrCode size={14} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <p className="text-xs text-green-700 dark:text-green-300">
                  Sign in as <strong>Admin</strong>, <strong>Teacher</strong>, or <strong>Gateman</strong>. Each role sees a different view.
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
                  placeholder="admin@greenfield.edu.ng"
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
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className={cn("btn-primary w-full py-3", loading && "opacity-75")}
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                ) : (
                  "Sign in to school portal"
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 dark:text-[#4a7a5a] mt-6">
              Parent? Use the{" "}
              <a href="/portal" className="text-green-600 dark:text-green-400 hover:underline font-medium">
                Parent Portal
              </a>{" "}
              instead.
            </p>
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-[#4a7a5a] mt-6">
            Powered by Attendy · Built for Nigerian Schools
          </p>
        </div>
      </div>
    </div>
  );
}