"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase handles the token from the URL hash automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          if (session) setSessionReady(true);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  if (done) {
    return (
      <div className="text-center">
        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Password set!
        </h2>
        <p className="text-sm text-slate-500 dark:text-[#6b9e7a]">
          Redirecting you to the dashboard…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          Set your password
        </h2>
        <p className="text-sm text-slate-500 dark:text-[#6b9e7a]">
          You've been invited to join your school on Attendy. Set a password to continue.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
          New password
        </label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            className="input-base pr-10"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
          Confirm password
        </label>
        <input
          type="password"
          className="input-base"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !password || !confirmPassword}
        className={cn("btn-primary w-full py-3", loading && "opacity-75")}
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Setting password…</>
        ) : (
          "Set password & continue"
        )}
      </button>
    </form>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 shadow-lg shadow-green-500/30 mb-4">
              <GraduationCap size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendy Edu</h1>
            <p className="text-sm text-slate-500 dark:text-[#6b9e7a] mt-1">
              School Attendance Management
            </p>
          </div>

          <div className="card p-8 shadow-xl shadow-green-500/5">
            <Suspense fallback={<div className="text-center py-4"><Loader2 size={24} className="animate-spin mx-auto text-green-500" /></div>}>
              <AcceptInviteForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}