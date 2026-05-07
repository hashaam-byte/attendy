"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message.includes("session") || err.message.includes("missing")
        ? "Reset link expired. Please request a new password reset from your admin."
        : err.message);
      setLoading(false);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 shadow-lg shadow-green-500/30 mb-4">
              <GraduationCap size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset Password</h1>
            <p className="text-sm text-slate-500 dark:text-[#6b9e7a] mt-1">Attendy Edu</p>
          </div>

          <div className="card p-8">
            {checking ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-green-500" />
              </div>
            ) : done ? (
              <div className="text-center py-6">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-slate-900 dark:text-white">Password updated!</p>
                <p className="text-sm text-slate-500 dark:text-[#6b9e7a] mt-1">Redirecting to dashboard…</p>
              </div>
            ) : !hasSession ? (
              <div className="text-center py-6">
                <AlertCircle size={48} className="text-red-500 mx-auto mb-3" />
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Link expired</p>
                <p className="text-sm text-slate-500 dark:text-[#6b9e7a] mb-6">
                  This password reset link has expired or was already used.
                  Contact your school admin to send a new one.
                </p>
                <a href="/login" className="btn-primary text-sm">Back to login</a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Choose a new password</h2>
                  <p className="text-sm text-slate-500 dark:text-[#6b9e7a]">Must be at least 8 characters.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">New password</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} className="input-base pr-10"
                      placeholder="At least 8 characters" value={password}
                      onChange={e => setPassword(e.target.value)} minLength={8} required />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">Confirm password</label>
                  <input type="password" className="input-base" placeholder="Repeat your password"
                    value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading || !password || !confirm}
                  className="btn-primary w-full py-3">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}