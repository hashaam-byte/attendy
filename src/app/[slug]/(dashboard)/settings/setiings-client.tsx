"use client";
// src/app/[slug]/settings/settings-client.tsx — ATTENDY-EDU v3
// Fully configurable: start time, grace period, SMS toggles, logo upload, staff invite

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  School, Clock, Bell, Users, CreditCard, Save, Loader2,
  Camera, CheckCircle, AlertTriangle, Trash2, Key,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { PLAN_LIMITS, type PlanType } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface OrgSettings {
  start_time: string;
  grace_period_minutes: number;
  school_days: number[];
  sms_on_arrival: boolean;
  sms_on_absence: boolean;
  absence_alert_time: string;
  welfare_alert_days: number;
  late_fee_enabled: boolean;
  late_fee_amount: number;
  term_start_date: string | null;
  term_end_date: string | null;
  whatsapp_notifications: boolean;
}

interface Props {
  org: any;
  staff: any[];
  currentUserId: string;
  slug: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SettingsClient({ org, staff, currentUserId, slug }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const rawSettings = (org?.settings || {}) as Partial<OrgSettings>;
  const [settings, setSettings] = useState<OrgSettings>({
    start_time: rawSettings.start_time || "07:30",
    grace_period_minutes: rawSettings.grace_period_minutes ?? 15,
    school_days: rawSettings.school_days || [1, 2, 3, 4, 5],
    sms_on_arrival: rawSettings.sms_on_arrival ?? true,
    sms_on_absence: rawSettings.sms_on_absence ?? true,
    absence_alert_time: rawSettings.absence_alert_time || "09:00",
    welfare_alert_days: rawSettings.welfare_alert_days ?? 3,
    late_fee_enabled: rawSettings.late_fee_enabled ?? false,
    late_fee_amount: rawSettings.late_fee_amount ?? 0,
    term_start_date: rawSettings.term_start_date || null,
    term_end_date: rawSettings.term_end_date || null,
    whatsapp_notifications: rawSettings.whatsapp_notifications ?? false,
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(org?.logo_url || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("teacher");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  // ── Settings save ────────────────────────────────────────
  async function saveSettings() {
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      const res = await fetch(`/api/org-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
        router.refresh();
      }
    } finally {
      setSavingSettings(false);
    }
  }

  // ── Logo upload ──────────────────────────────────────────
  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadLogo() {
    if (!logoFile) return;
    setUploadingLogo(true);
    try {
      const ext = logoFile.name.split(".").pop();
      const path = `${org.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("org-logos")
        .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("org-logos").getPublicUrl(path);

      const res = await fetch(`/api/org-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: publicUrl }),
      });
      if (res.ok) {
        setLogoSaved(true);
        setTimeout(() => setLogoSaved(false), 3000);
        router.refresh();
      }
    } catch (err) {
      console.error("Logo upload failed:", err);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeLogo() {
    await fetch(`/api/org-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logo_url: null }),
    });
    setLogoPreview(null);
    setLogoFile(null);
    router.refresh();
  }

  // ── Staff invite ─────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed.includes("@")) { setInviteResult("✗ Enter a valid email"); return; }
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await fetch("/api/invite-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, role: inviteRole, org_id: org.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteResult(`✓ Invite sent to ${trimmed}. They'll receive a link to set their password.`);
        setInviteEmail("");
      } else {
        setInviteResult(`✗ ${data.error ?? "Failed to send invite."}`);
      }
    } catch {
      setInviteResult("✗ Network error. Try again.");
    } finally {
      setInviting(false);
    }
  }

  function toggleDay(day: number) {
    setSettings((s) => ({
      ...s,
      school_days: s.school_days.includes(day)
        ? s.school_days.filter((d) => d !== day)
        : [...s.school_days, day].sort(),
    }));
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

      {/* ── School Logo ─────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">School Logo</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-[#4a7a5a]">
          Your logo appears on the login page, dashboard, QR cards, and all school-facing pages.
        </p>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#bbf7d0] dark:border-[#1a3a24] bg-green-50 dark:bg-green-950/20 flex items-center justify-center overflow-hidden shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-1" />
            ) : (
              <School size={28} className="text-green-300 dark:text-green-800" />
            )}
          </div>
          <div className="space-y-2 flex-1">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoSelect}
              className="hidden"
            />
            <button onClick={() => logoInputRef.current?.click()} className="btn-secondary text-xs w-full justify-center">
              {logoPreview ? "Change Logo" : "Upload Logo"}
            </button>
            {logoFile && (
              <button
                onClick={uploadLogo}
                disabled={uploadingLogo}
                className="btn-primary text-xs w-full justify-center"
              >
                {uploadingLogo ? <><Loader2 size={12} className="animate-spin" />Uploading…</> :
                 logoSaved ? <><CheckCircle size={12} />Saved!</> : <><Save size={12} />Save Logo</>}
              </button>
            )}
            {logoPreview && org?.logo_url && !logoFile && (
              <button onClick={removeLogo} className="btn-secondary text-xs w-full justify-center text-red-500 hover:border-red-300">
                <Trash2 size={12} />Remove Logo
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">PNG, JPG, or SVG. Recommended: 200×200px square.</p>
      </div>

      {/* ── Attendance Rules ─────────────────────────────── */}
      <div className="card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attendance Rules</h3>
          </div>
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="btn-primary text-xs py-1.5"
          >
            {savingSettings ? <Loader2 size={12} className="animate-spin" /> :
             settingsSaved ? <CheckCircle size={12} /> : <Save size={12} />}
            {settingsSaved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* School start time */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">
              School Start Time
            </label>
            <input
              type="time"
              className="input-base"
              value={settings.start_time}
              onChange={(e) => setSettings((s) => ({ ...s, start_time: e.target.value }))}
            />
            <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-1">When the school day officially begins</p>
          </div>

          {/* Grace period */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">
              Grace Period: <span className="text-green-600 dark:text-green-400">{settings.grace_period_minutes} minutes</span>
            </label>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={settings.grace_period_minutes}
              onChange={(e) => setSettings((s) => ({ ...s, grace_period_minutes: Number(e.target.value) }))}
              className="w-full accent-green-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-[#4a7a5a]">
              <span>0 min</span>
              <span>Late after {(() => {
                const [h, m] = settings.start_time.split(":").map(Number);
                const total = h * 60 + m + settings.grace_period_minutes;
                const ch = Math.floor(total / 60), cm = total % 60;
                return `${ch}:${String(cm).padStart(2, "0")} ${ch >= 12 ? "PM" : "AM"}`;
              })()}</span>
              <span>60 min</span>
            </div>
          </div>
        </div>

        {/* School days */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-2">School Days</label>
          <div className="flex gap-2">
            {DAYS.map((day, i) => (
              <button
                key={day}
                onClick={() => toggleDay(i)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                  settings.school_days.includes(i)
                    ? "bg-green-600 border-green-600 text-white"
                    : "border-[#bbf7d0] dark:border-[#1a3a24] text-slate-500 dark:text-green-300 hover:bg-green-50"
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Absence alert time */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">
            Absence Alert Time
          </label>
          <input
            type="time"
            className="input-base max-w-[200px]"
            value={settings.absence_alert_time}
            onChange={(e) => setSettings((s) => ({ ...s, absence_alert_time: e.target.value }))}
          />
          <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-1">
            If a student hasn't scanned by this time, an absence SMS fires to their parent.
          </p>
        </div>

        {/* Welfare alert days */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">
            Welfare Alert: <span className="text-green-600 dark:text-green-400">{settings.welfare_alert_days} consecutive absent days</span>
          </label>
          <input
            type="range"
            min={2}
            max={10}
            value={settings.welfare_alert_days}
            onChange={(e) => setSettings((s) => ({ ...s, welfare_alert_days: Number(e.target.value) }))}
            className="w-full accent-green-600"
          />
          <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-1">
            Flag a student for welfare check if absent {settings.welfare_alert_days}+ days in a row.
          </p>
        </div>

        {/* Term dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">Term Start Date</label>
            <input
              type="date"
              className="input-base"
              value={settings.term_start_date || ""}
              onChange={(e) => setSettings((s) => ({ ...s, term_start_date: e.target.value || null }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">Term End Date</label>
            <input
              type="date"
              className="input-base"
              value={settings.term_end_date || ""}
              onChange={(e) => setSettings((s) => ({ ...s, term_end_date: e.target.value || null }))}
            />
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">Term dates are used to calculate per-student attendance percentages in reports.</p>
      </div>

      {/* ── Notifications ────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
        </div>
        {[
          { key: "sms_on_arrival", label: "SMS on arrival", desc: "Text parent when student scans in at the gate" },
          { key: "sms_on_absence", label: "SMS on absence", desc: `Text parent if student hasn't arrived by ${settings.absence_alert_time}` },
          { key: "whatsapp_notifications", label: "WhatsApp (if enabled)", desc: "Send via WhatsApp instead of plain SMS (requires WhatsApp Business setup)" },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
              <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">{desc}</p>
            </div>
            <button
              onClick={() => setSettings((s) => ({ ...s, [key]: !s[key as keyof OrgSettings] }))}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors shrink-0",
                settings[key as keyof OrgSettings] ? "bg-green-600" : "bg-slate-200 dark:bg-[#1a3a24]"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                  settings[key as keyof OrgSettings] ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        ))}
        <button onClick={saveSettings} disabled={savingSettings} className="btn-primary text-xs py-1.5 w-full justify-center">
          {savingSettings ? <Loader2 size={12} className="animate-spin" /> : settingsSaved ? <CheckCircle size={12} /> : <Save size={12} />}
          {settingsSaved ? "Saved!" : "Save Notification Settings"}
        </button>
      </div>

      {/* ── Subscription ─────────────────────────────────── */}
      <div className={cn("card p-5 space-y-3", isExpiringSoon && "border-amber-300 dark:border-amber-700/50")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Subscription</h3>
          </div>
          <span className={cn("badge capitalize", {
            "badge-blue": org?.plan === "trial",
            "badge-green": org?.plan === "basic" || org?.plan === "standard",
            "badge-amber": org?.plan === "premium" || org?.plan === "enterprise",
          })}>
            {org?.plan ?? "trial"}
          </span>
        </div>

        {isExpiringSoon && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-300 flex gap-2">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            Your plan expires on <strong>{formatDate(org?.plan_expires_at)}</strong>. Contact Attendy on WhatsApp to renew.
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
        <a
          href="https://wa.me/2348077291745?text=Hi%20Attendy%2C%20I%20need%20to%20upgrade%20my%20school%20plan"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-xs w-full justify-center"
        >
          Upgrade Plan on WhatsApp →
        </a>
      </div>

      {/* ── Staff management ─────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Staff Accounts</h3>
        </div>

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

        {inviteResult && (
          <div className={cn(
            "p-3 rounded-lg text-xs leading-relaxed",
            inviteResult.startsWith("✓")
              ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 text-green-700 dark:text-green-300"
              : "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400"
          )}>
            {inviteResult}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#bbf7d0] dark:border-[#1a3a24]">
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th">Joined</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="table-row">
                  <td className="table-td font-mono text-xs truncate max-w-[180px]">
                    {s.email ?? s.user_id.slice(0, 8) + "…"}
                    {s.user_id === currentUserId && <span className="ml-1 text-[10px] text-green-600 dark:text-green-400">(you)</span>}
                  </td>
                  <td className="table-td">
                    <span className="badge-gray capitalize">{s.role}</span>
                  </td>
                  <td className="table-td">
                    <span className={cn("badge", s.is_active ? "badge-green" : "badge-red")}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-td text-xs text-slate-400 dark:text-[#4a7a5a]">
                    {formatDate(s.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── School Info ───────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <School size={16} className="text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">School Details</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { label: "School Name", value: org?.name },
            { label: "School ID (slug)", value: org?.slug },
            { label: "Timezone", value: org?.timezone ?? "Africa/Lagos" },
            { label: "Scanner URL", value: `attendy-edu.vercel.app/scan/${org?.slug}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mb-0.5">{label}</p>
              <p className="font-medium text-slate-900 dark:text-white font-mono text-xs truncate">{value ?? "—"}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">
          To change the school name, contact Attendy support on WhatsApp.
        </p>
      </div>
    </div>
  );
}