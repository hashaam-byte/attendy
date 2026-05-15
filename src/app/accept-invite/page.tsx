"use client";
// src/app/accept-invite/page.tsx — ATTENDY-EDU v3
// After invite email link → user sets password → redirect to their school's /${slug}/dashboard

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function AcceptInviteForm() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("This invite link has expired or was already used. Ask your admin for a new invite.");
        setChecking(false);
        return;
      }
      setUserEmail(session.user.email ?? null);

      // Look up the user's org slug for redirect
      const { data: orgUser } = await supabase
        .from("org_users")
        .select("organisations(slug)")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .single();

      const slug = (orgUser?.organisations as any)?.slug ?? null;
      setOrgSlug(slug);
      setChecking(false);
    })();
  }, []);

  const strengthScore =
    password.length === 0 ? 0 :
    password.length < 8 ? 1 :
    password.length < 12 ? 2 :
    /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;

  const strengthLabel = ["", "Too short", "Weak", "Good", "Strong"][strengthScore];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-green-500"][strengthScore];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(
        updateError.message.toLowerCase().includes("session") || updateError.message.toLowerCase().includes("missing")
          ? "Your session expired. Ask your admin to send a fresh invite link."
          : updateError.message
      );
      setLoading(false);
      return;
    }

    setDone(true);
    // Redirect to school portal or generic dashboard
    const target = orgSlug ? `/${orgSlug}/dashboard` : "/dashboard";
    setTimeout(() => router.push(target), 1800);
  }

  if (checking) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <Loader2 size={28} className="animate-spin text-green-500" />
        <p className="text-sm text-slate-500 dark:text-[#6b9e7a]">Verifying your invite link…</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-10">
        <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Password set!</h2>
        <p className="text-sm text-slate-500 dark:text-[#6b9e7a]">
          Taking you to {orgSlug ? `${orgSlug}'s dashboard` : "your dashboard"}…
        </p>
      </div>
    );
  }

  if (error && !userEmail) {
    return (
      <div className="text-center py-8">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Invite link invalid</h2>
        <p className="text-sm text-slate-500 dark:text-[#6b9e7a] mb-6">{error}</p>
        <a href="/" className="btn-primary text-sm inline-flex">Back to home</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Set your password</h2>
        <p className="text-sm text-slate-500 dark:text-[#6b9e7a]">
          {userEmail ? `Welcome, ${userEmail}.` : "You've been invited."}{" "}
          Choose a password to access {orgSlug ? `${orgSlug}'s school portal` : "your school portal"}.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">New password</label>
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
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex gap-1 flex-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors",
                  strengthScore >= i ? strengthColor : "bg-slate-200 dark:bg-[#1a3a24]")} />
              ))}
            </div>
            <span className="text-[11px] text-slate-400">{strengthLabel}</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">Confirm password</label>
        <input
          type="password"
          className={cn("input-base", confirmPassword && confirmPassword !== password && "border-red-400")}
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {confirmPassword && confirmPassword !== password && (
          <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !password || !confirmPassword || password !== confirmPassword}
        className={cn("btn-primary w-full py-3 justify-center", loading && "opacity-75")}
      >
        {loading
          ? <><Loader2 size={16} className="animate-spin" /> Setting password…</>
          : "Set password & continue"}
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
            <p className="text-sm text-slate-500 dark:text-[#6b9e7a] mt-1">School Attendance Management</p>
          </div>
          <div className="card p-8 shadow-xl shadow-green-500/5">
            <Suspense fallback={<div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-green-500" /></div>}>
              <AcceptInviteForm />
            </Suspense>
          </div>
          <p className="text-center text-xs text-slate-400 dark:text-[#4a7a5a] mt-6">
            Powered by Attendy · Built for Nigerian Schools
          </p>
        </div>
      </div>
    </div>
  );
}