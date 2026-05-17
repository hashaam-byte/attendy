"use client";
// src/app/[slug]/(dashboard)/settings/change-password/page.tsx — ATTENDY-EDU
// Staff can change their own password when logged in.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// This page lives at /[slug]/settings/change-password
// Extract slug from the URL via useParams or pass as a prop.
// Since it's inside /[slug]/(dashboard)/settings/, params are available.
import { use } from "react";

export default function ChangePasswordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password strength
  const strengthScore =
    newPassword.length === 0 ? 0 :
    newPassword.length < 8 ? 1 :
    newPassword.length < 12 ? 2 :
    /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 4 : 3;
  const strengthLabel = ["", "Too short", "Weak", "Good", "Strong"][strengthScore];
  const strengthColor = [
    "",
    "bg-red-400",
    "bg-amber-400",
    "bg-blue-400",
    "bg-green-500",
  ][strengthScore];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // Re-authenticate with current password first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setError("Could not get current user. Please refresh and try again.");
      setLoading(false);
      return;
    }

    // Verify current password by signing in again
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      setError("Current password is incorrect.");
      setLoading(false);
      return;
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push(`/${slug}/settings`), 2000);
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto pt-12 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Password updated!</h2>
        <p className="text-sm text-slate-500 dark:text-[#6b9e7a]">Redirecting back to settings…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/${slug}/settings`} className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="page-title">Change Password</h2>
          <p className="page-sub">Update your account password</p>
        </div>
      </div>

      {/* Security note */}
      <div className="card p-4 border-green-200 dark:border-green-900/40 bg-green-50/50 dark:bg-green-950/10 flex items-start gap-3">
        <ShieldCheck size={16} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
        <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">
          For your security, enter your current password to confirm your identity before setting a new one.
        </p>
      </div>

      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Password Settings</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                className="input-base pr-10"
                placeholder="Your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#bbf7d0] dark:border-[#1a3a24]" />

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className="input-base pr-10"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {/* Strength indicator */}
            {newPassword.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-200",
                        strengthScore >= i ? strengthColor : "bg-slate-200 dark:bg-[#1a3a24]"
                      )}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 dark:text-[#4a7a5a] min-w-[40px] text-right">
                  {strengthLabel}
                </span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              className={cn(
                "input-base",
                confirmPassword && confirmPassword !== newPassword
                  ? "border-red-400 dark:border-red-600 focus:border-red-400"
                  : ""
              )}
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> Passwords do not match
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Link href={`/${slug}/settings`} className="btn-secondary flex-1 justify-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={
                loading ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                newPassword !== confirmPassword ||
                newPassword.length < 8
              }
              className="btn-primary flex-1 justify-center"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <KeyRound size={14} />
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <p className="text-xs text-center text-slate-400 dark:text-[#4a7a5a]">
        Forgotten your password?{" "}
        <Link href={`/${slug}/login`} className="text-green-600 dark:text-green-400 hover:underline">
          Sign out and reset it →
        </Link>
      </p>
    </div>
  );
}