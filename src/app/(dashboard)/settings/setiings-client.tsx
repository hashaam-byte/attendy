"use client";

import { useState } from "react";
import {
  School, Clock, Bell, Users, CreditCard, Save, Loader2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { PLAN_LIMITS, type PlanType } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export function SettingsClient({
  org,
  staff,
  currentUserId,
}: {
  org: any;
  staff: any[];
  currentUserId: string;
}) {
  const supabase = createClient();
  const [saved, setSaved] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("teacher");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  function showSaved(key: string) {
    setSaved(key);
    setTimeout(() => setSaved(null), 2500);
  }

async function handleInvite(e: React.FormEvent) {
  e.preventDefault();
  const trimmedEmail = inviteEmail.trim().toLowerCase();

  if (!trimmedEmail) return;

  // Basic email validation
  if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
    setInviteResult("✗ Please enter a valid email address");
    return;
  }

  setInviting(true);
  setInviteResult(null);

  try {
    const res = await fetch("/api/invite-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: trimmedEmail,
        role: inviteRole,
        org_id: org.id,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setInviteResult(
        `✓ Invite sent to ${trimmedEmail}. They will receive an email with a link to set their password and log in.`
      );
      setInviteEmail("");
    } else {
      // Show the actual error from the server
      setInviteResult(`✗ ${data.error ?? "Failed to send invite. Please try again."}`);
    }
  } catch {
    setInviteResult("✗ Network error. Check your connection and try again.");
  } finally {
    setInviting(false);
  }
}



  const planLimit = PLAN_LIMITS[org?.plan as PlanType] ?? PLAN_LIMITS.trial;
  const planExpiry = org?.plan_expires_at ? new Date(org.plan_expires_at) : null;
  const isExpiringSoon = planExpiry ? planExpiry < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : false;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="page-title">Settings</h2>
        <p className="page-sub">School configuration and account management</p>
      </div>

      {/* School Info */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <School size={16} className="text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">School Details</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            { label: "School Name", value: org?.name },
            { label: "Slug (URL ID)", value: org?.slug },
            { label: "Industry", value: org?.industry },
            { label: "Timezone", value: org?.timezone ?? "Africa/Lagos" },
            { label: "Primary Colour", value: org?.primary_color ?? "#22c55e" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mb-0.5">{label}</p>
              <p className="font-medium text-slate-900 dark:text-white font-mono text-xs truncate">{value ?? "—"}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">
          To update school name or logo, contact Attendy support via WhatsApp.
        </p>
      </div>

      {/* Plan Info */}
      <div className={cn("card p-5 space-y-3", isExpiringSoon && "border-amber-300 dark:border-amber-700/50")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Subscription</h3>
          </div>
          <span className={cn("badge capitalize", {
            "badge-blue": org?.plan === "trial",
            "badge-green": org?.plan === "basic" || org?.plan === "standard",
            "badge-amber": org?.plan === "premium",
          })}>
            {org?.plan ?? "trial"}
          </span>
        </div>

        {isExpiringSoon && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-300">
            ⚠️ Your plan expires on <strong>{formatDate(org?.plan_expires_at)}</strong>. Contact Attendy to renew.
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Max Students", value: planLimit.members === 99999 ? "∞" : planLimit.members },
            { label: "SMS/month", value: planLimit.sms === 999999 ? "∞" : planLimit.sms },
            { label: "Expires", value: planExpiry ? formatDate(org?.plan_expires_at) : "Never" },
          ].map(({ label, value }) => (
            <div key={label} className="card p-3">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{value}</p>
              <p className="text-[10px] text-slate-400 dark:text-[#4a7a5a] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">
          To upgrade your plan, contact Attendy via WhatsApp or email.
        </p>
      </div>

      {/* Attendance Settings */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attendance Rules</h3>
        </div>
        <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">
          These settings control when a scan is marked as "late". Contact Attendy support to configure school start time and grace period for your school.
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: "School Start", value: "07:30 AM (default)" },
            { label: "Grace Period", value: "15 minutes" },
            { label: "School Days", value: "Mon – Fri" },
          ].map(({ label, value }) => (
            <div key={label} className="card p-3">
              <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">{label}</p>
              <p className="font-medium text-slate-900 dark:text-white text-sm">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Staff management */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Staff Accounts</h3>
        </div>

        {/* Invite form */}
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
          <input
            className="input-base flex-1"
            type="email"
            placeholder="teacher@school.edu.ng"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <select className="input-base w-auto" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            <option value="teacher">Teacher</option>
            <option value="gateman">Gateman</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={inviting || !inviteEmail} className="btn-primary whitespace-nowrap">
            {inviting ? <Loader2 size={14} className="animate-spin" /> : null}
            Invite
          </button>
        </form>

        /
{inviteResult && (
  <div className={cn(
    "p-3 rounded-lg text-xs leading-relaxed",
    inviteResult.startsWith("✓")
      ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 text-green-700 dark:text-green-300"
      : "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300"
  )}>
    {inviteResult}
  </div>
)}

        {/* Staff table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#bbf7d0] dark:border-[#1a3a24]">
                <th className="table-th">User ID</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="table-row">
                  <td className="table-td font-mono text-xs truncate max-w-[140px]">
                    {s.user_id === currentUserId ? `${s.user_id.slice(0, 8)}… (you)` : s.user_id.slice(0, 8) + "…"}
                  </td>
                  <td className="table-td">
                    <span className="badge-gray capitalize">{s.role}</span>
                  </td>
                  <td className="table-td">
                    <span className={cn("badge", s.is_active ? "badge-green" : "badge-red")}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}