"use client";
// src/app/[slug]/settings/setiings-client.tsx — ATTENDY-EDU v3

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  School, Clock, Bell, Users, CreditCard, Save, Loader2,
  Camera, CheckCircle, AlertTriangle, Trash2, X,
  UserCheck, ShieldOff, KeyRound, ChevronRight,
  UserPlus, Copy, Eye, EyeOff,
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

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  email: string | null;
}

interface Props {
  org: any;
  staff: StaffMember[];
  currentUserId: string;
  slug: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Confirm dialog ─────────────────────────────────────────────
function ConfirmDialog({
  title, message, confirmLabel, danger, onConfirm, onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 space-y-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            danger ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"
          )}>
            <AlertTriangle size={18} className={danger ? "text-red-500" : "text-amber-500"} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-[#6b9e7a] mt-1 leading-relaxed">{message}</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5">
            <X size={14} />
          </button>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center text-xs">Cancel</button>
          <button
            onClick={onConfirm}
            className={cn(
              "flex-1 justify-center inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-medium transition-all",
              danger ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Staff Modal ────────────────────────────────────────────
function AddStaffModal({
  orgId, orgSlug, onClose, onAdded,
}: {
  orgId: string;
  orgSlug: string;
  onClose: () => void;
  onAdded: (member: StaffMember) => void;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("teacher");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    email: string;
    password: string;
    smsSent: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Default password: slug + "123"
  const defaultPassword = `${orgSlug}123`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/create-school-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password: defaultPassword,
        role,
        organisation_id: orgId,
        org_name: orgSlug,
        phone: phone.trim() || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create user.");
      return;
    }

    setResult({
      email: email.trim().toLowerCase(),
      password: defaultPassword,
      smsSent: data.sms_sent ?? false,
    });

    onAdded({
      id: `temp-${Date.now()}`,
      user_id: data.user.id,
      email: email.trim().toLowerCase(),
      role,
      is_active: true,
      created_at: new Date().toISOString(),
    });
  }

  function copyCredentials() {
    if (!result) return;
    navigator.clipboard.writeText(
      `Your Attendy Login Details\n\nSchool ID: ${orgSlug}\nEmail: ${result.email}\nPassword: ${result.password}\nLogin: https://attendy-edu.vercel.app/${orgSlug}/login\n\nPlease change your password after logging in.`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#bbf7d0] dark:border-[#1a3a24] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <UserPlus size={14} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Add Staff Member</p>
              <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">Creates a login for the school portal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-green-950/30 text-slate-400">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">
          {result ? (
            /* ── Success state ── */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle size={18} />
                <span className="text-sm font-semibold">Account created successfully!</span>
              </div>

              {result.smsSent && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 text-xs text-green-700 dark:text-green-300">
                  ✓ Login credentials sent to their phone via SMS.
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-[#6b9e7a]">
                Share these credentials with the staff member. Ask them to log in and change their password immediately.
              </p>

              {/* Credentials box */}
              <div className="bg-slate-50 dark:bg-white/[0.03] border border-[#e2e8f0] dark:border-[#1a3a24] rounded-xl p-4 space-y-3 font-mono text-xs">
                {[
                  { label: "School ID", value: orgSlug },
                  { label: "Email", value: result.email },
                  {
                    label: "Password",
                    value: showPassword ? result.password : "••••••••",
                    action: (
                      <button
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
                      >
                        {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                    ),
                  },
                  { label: "Login URL", value: `attendy-edu.vercel.app/${orgSlug}/login` },
                ].map(({ label, value, action }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 shrink-0">{label}</span>
                    <div className="flex items-center gap-1 text-right">
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{value}</span>
                      {action}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-300">
                💡 Remind them: Settings → <strong>Change My Password</strong> after first login.
              </div>

              <div className="flex gap-2">
                <button onClick={copyCredentials} className="btn-secondary flex-1 justify-center text-xs">
                  {copied ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy All</>}
                </button>
                <button onClick={onClose} className="btn-primary flex-1 justify-center text-xs">Done</button>
              </div>
            </div>
          ) : (
            /* ── Create form ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Default password info */}
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 text-xs text-green-700 dark:text-green-300 space-y-1">
                <p className="font-semibold">Default password: <span className="font-mono bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded">{defaultPassword}</span></p>
                <p className="opacity-80">This is automatically set. The staff member should change it after first login via Settings → Change Password.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="input-base"
                  placeholder="teacher@school.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">
                  Phone number <span className="text-slate-400 font-normal">(optional — for SMS)</span>
                </label>
                <input
                  type="tel"
                  className="input-base"
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 dark:text-[#4a7a5a] mt-1">
                  If provided, their login credentials will be sent to this number via SMS.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: "admin", label: "Admin", desc: "Full dashboard — students, reports, settings, staff" },
                    { value: "teacher", label: "Teacher", desc: "Class attendance + view reports for their class" },
                    { value: "gateman", label: "Gateman", desc: "Scanner only — goes straight to scanner on login" },
                  ].map(({ value, label, desc }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        role === value
                          ? "border-green-500 bg-green-50 dark:bg-green-950/30 dark:border-green-700"
                          : "border-[#bbf7d0] dark:border-[#1a3a24] hover:bg-green-50/50 dark:hover:bg-green-950/10"
                      )}
                    >
                      <input
                        type="radio"
                        name="staff-role"
                        value={value}
                        checked={role === value}
                        onChange={() => setRole(value)}
                        className="mt-0.5 accent-green-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
                        <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading || !email} className="btn-primary flex-1 justify-center">
                  {loading
                    ? <><Loader2 size={13} className="animate-spin" /> Creating…</>
                    : <><UserPlus size={13} /> Create Login</>
                  }
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function SettingsClient({ org, staff: initialStaff, currentUserId, slug }: Props) {
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

  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  type ConfirmState = { type: "suspend" | "reactivate" | "delete"; member: StaffMember } | null;
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  // ── Settings save ──────────────────────────────────────────
  async function saveSettings() {
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      const res = await fetch("/api/org-settings", {
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

  // ── Logo upload ────────────────────────────────────────────
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
      const res = await fetch("/api/org-settings", {
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
    await fetch("/api/org-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logo_url: null }),
    });
    setLogoPreview(null);
    setLogoFile(null);
    router.refresh();
  }

  // ── Staff actions ──────────────────────────────────────────
  async function executeSuspend(member: StaffMember) {
    setActionLoading(member.id);
    try {
      const res = await fetch("/api/manage-staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_user_id: member.id, is_active: false }),
      });
      if (res.ok) setStaffList((prev) => prev.map((s) => s.id === member.id ? { ...s, is_active: false } : s));
    } finally {
      setActionLoading(null); setConfirm(null); setExpandedStaffId(null);
    }
  }

  async function executeReactivate(member: StaffMember) {
    setActionLoading(member.id);
    try {
      const res = await fetch("/api/manage-staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_user_id: member.id, is_active: true }),
      });
      if (res.ok) setStaffList((prev) => prev.map((s) => s.id === member.id ? { ...s, is_active: true } : s));
    } finally {
      setActionLoading(null); setConfirm(null); setExpandedStaffId(null);
    }
  }

  async function executeDelete(member: StaffMember) {
    setActionLoading(member.id);
    try {
      const res = await fetch(
        `/api/manage-staff?org_user_id=${encodeURIComponent(member.id)}`,
        { method: "DELETE" }
      );
      if (res.ok) setStaffList((prev) => prev.filter((s) => s.id !== member.id));
    } finally {
      setActionLoading(null); setConfirm(null); setExpandedStaffId(null);
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
  const isExpiringSoon = planExpiry
    ? planExpiry < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="page-title">Settings</h2>
        <p className="page-sub">School configuration and account management</p>
      </div>

      {/* ── School Logo ──────────────────────────────────── */}
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
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
              : <School size={28} className="text-green-300 dark:text-green-800" />}
          </div>
          <div className="space-y-2 flex-1">
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoSelect} className="hidden" />
            <button onClick={() => logoInputRef.current?.click()} className="btn-secondary text-xs w-full justify-center">
              {logoPreview ? "Change Logo" : "Upload Logo"}
            </button>
            {logoFile && (
              <button onClick={uploadLogo} disabled={uploadingLogo} className="btn-primary text-xs w-full justify-center">
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

      {/* ── Attendance Rules ──────────────────────────────── */}
      <div className="card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attendance Rules</h3>
          </div>
          <button onClick={saveSettings} disabled={savingSettings} className="btn-primary text-xs py-1.5">
            {savingSettings ? <Loader2 size={12} className="animate-spin" /> :
             settingsSaved ? <CheckCircle size={12} /> : <Save size={12} />}
            {settingsSaved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">School Start Time</label>
            <input type="time" className="input-base" value={settings.start_time}
              onChange={(e) => setSettings((s) => ({ ...s, start_time: e.target.value }))} />
            <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-1">When the school day officially begins</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">
              Grace Period: <span className="text-green-600 dark:text-green-400">{settings.grace_period_minutes} min</span>
            </label>
            <input type="range" min={0} max={60} step={5} value={settings.grace_period_minutes}
              onChange={(e) => setSettings((s) => ({ ...s, grace_period_minutes: Number(e.target.value) }))}
              className="w-full accent-green-600" />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-[#4a7a5a] mt-1">
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

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-2">School Days</label>
          <div className="flex gap-1.5">
            {DAYS.map((day, i) => (
              <button key={day} onClick={() => toggleDay(i)}
                className={cn("flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                  settings.school_days.includes(i)
                    ? "bg-green-600 border-green-600 text-white"
                    : "border-[#bbf7d0] dark:border-[#1a3a24] text-slate-500 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"
                )}>
                {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">Absence Alert Time</label>
          <input type="time" className="input-base max-w-[200px]" value={settings.absence_alert_time}
            onChange={(e) => setSettings((s) => ({ ...s, absence_alert_time: e.target.value }))} />
          <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-1">
            If a student hasn't scanned by this time, an absence SMS fires to their parent.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">
            Welfare Alert: <span className="text-green-600 dark:text-green-400">{settings.welfare_alert_days} consecutive absent days</span>
          </label>
          <input type="range" min={2} max={10} value={settings.welfare_alert_days}
            onChange={(e) => setSettings((s) => ({ ...s, welfare_alert_days: Number(e.target.value) }))}
            className="w-full accent-green-600" />
          <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-1">
            Flag a student for a welfare check if absent {settings.welfare_alert_days}+ days in a row.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">Term Start Date</label>
            <input type="date" className="input-base" value={settings.term_start_date || ""}
              onChange={(e) => setSettings((s) => ({ ...s, term_start_date: e.target.value || null }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-1.5">Term End Date</label>
            <input type="date" className="input-base" value={settings.term_end_date || ""}
              onChange={(e) => setSettings((s) => ({ ...s, term_end_date: e.target.value || null }))} />
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
          { key: "whatsapp_notifications", label: "WhatsApp (if enabled)", desc: "Send via WhatsApp instead of plain SMS" },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
              <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">{desc}</p>
            </div>
            <button
              onClick={() => setSettings((s) => ({ ...s, [key]: !s[key as keyof OrgSettings] }))}
              className={cn("relative w-10 h-5 rounded-full transition-colors shrink-0",
                settings[key as keyof OrgSettings] ? "bg-green-600" : "bg-slate-200 dark:bg-[#1a3a24]"
              )}>
              <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                settings[key as keyof OrgSettings] ? "translate-x-5" : "translate-x-0")} />
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
          })}>{org?.plan ?? "trial"}</span>
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
        <a href="https://wa.me/2348077291745?text=Hi%20Attendy%2C%20I%20need%20to%20upgrade%20my%20school%20plan"
          target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs w-full justify-center">
          Upgrade Plan on WhatsApp →
        </a>
      </div>

      {/* ── Staff Management ─────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Staff Accounts</h3>
          </div>
          <button onClick={() => setShowAddStaff(true)} className="btn-primary text-xs py-1.5 gap-1.5">
            <UserPlus size={13} /> Add Staff
          </button>
        </div>

        {/* Change My Password */}
        <Link
          href={`/${slug}/settings/change-password`}
          className="flex items-center justify-between p-3 rounded-xl border border-[#bbf7d0] dark:border-[#1a3a24] hover:bg-green-50 dark:hover:bg-green-950/20 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <KeyRound size={14} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Change My Password</p>
              <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">Update your login password</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-300 dark:text-[#2d5a3d] shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* Staff list — expandable rows, no dropdown */}
        <div className="space-y-2">
          {staffList.length === 0 && (
            <div className="py-8 text-center">
              <Users size={28} className="mx-auto text-green-200 dark:text-green-800 mb-2" />
              <p className="text-sm text-slate-400 dark:text-[#4a7a5a]">No staff accounts yet.</p>
              <button onClick={() => setShowAddStaff(true)} className="btn-primary text-xs mt-3">
                <UserPlus size={13} /> Add First Staff Member
              </button>
            </div>
          )}

          {staffList.map((s) => {
            const isSelf = s.user_id === currentUserId;
            const isExpanded = expandedStaffId === s.id;
            const isActioning = actionLoading === s.id;

            return (
              <div
                key={s.id}
                className={cn(
                  "rounded-xl border overflow-hidden transition-all",
                  isExpanded
                    ? "border-green-400 dark:border-green-700"
                    : "border-[#bbf7d0] dark:border-[#1a3a24]",
                  !s.is_active && "opacity-60"
                )}
              >
                {/* Main row */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-green-50/50 dark:hover:bg-green-950/10 transition-colors"
                  onClick={() => !isSelf && setExpandedStaffId(isExpanded ? null : s.id)}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    s.role === "admin"
                      ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                      : s.role === "teacher"
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                  )}>
                    {(s.email ?? s.user_id)[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {s.email ?? `${s.user_id.slice(0, 12)}…`}
                      {isSelf && (
                        <span className="ml-1.5 text-[10px] text-green-600 dark:text-green-400 font-normal">(you)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="badge-gray capitalize text-[10px]">{s.role}</span>
                      <span className="text-[10px] text-slate-300 dark:text-[#2d5a3d]">·</span>
                      <span className="text-[10px] text-slate-400 dark:text-[#4a7a5a]">
                        {formatDate(s.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Status + caret */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("badge text-[10px]", s.is_active ? "badge-green" : "badge-red")}>
                      {s.is_active ? "Active" : "Suspended"}
                    </span>
                    {!isSelf && (
                      <ChevronRight
                        size={14}
                        className={cn(
                          "text-slate-300 dark:text-[#2d5a3d] transition-transform duration-200",
                          isExpanded && "rotate-90"
                        )}
                      />
                    )}
                  </div>
                </button>

                {/* Expanded actions — inline, no dropdown */}
                {isExpanded && !isSelf && (
                  <div className="px-4 py-3 border-t border-[#bbf7d0] dark:border-[#1a3a24] bg-green-50/30 dark:bg-green-950/10 flex flex-wrap gap-2">
                    {s.is_active ? (
                      <button
                        onClick={() => setConfirm({ type: "suspend", member: s })}
                        disabled={isActioning}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-[#0f2018] border border-amber-300 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors disabled:opacity-50"
                      >
                        {isActioning ? <Loader2 size={11} className="animate-spin" /> : <ShieldOff size={11} />}
                        Suspend access
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirm({ type: "reactivate", member: s })}
                        disabled={isActioning}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-[#0f2018] border border-green-300 dark:border-green-800/50 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors disabled:opacity-50"
                      >
                        {isActioning ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />}
                        Reactivate
                      </button>
                    )}
                    <button
                      onClick={() => setConfirm({ type: "delete", member: s })}
                      disabled={isActioning}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-[#0f2018] border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
                    >
                      {isActioning ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      Delete permanently
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 dark:text-[#4a7a5a]">
          Tap a staff row to expand actions. Suspended staff cannot log in but can be reactivated.
        </p>
      </div>

      {/* ── School Info ──────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <School size={16} className="text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">School Details</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* Modals */}
      {showAddStaff && (
        <AddStaffModal
          orgId={org.id}
          orgSlug={slug}
          onClose={() => setShowAddStaff(false)}
          onAdded={(member) => setStaffList((prev) => [member, ...prev])}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.type === "delete" ? "Delete staff member permanently?" :
            confirm.type === "suspend" ? "Suspend staff access?" : "Reactivate staff member?"
          }
          message={
            confirm.type === "delete"
              ? `This will permanently remove ${confirm.member.email ?? "this user"} from Attendy. This cannot be undone.`
              : confirm.type === "suspend"
              ? `${confirm.member.email ?? "This user"} will no longer be able to log in. You can reactivate them any time.`
              : `${confirm.member.email ?? "This user"} will regain access to the school portal.`
          }
          confirmLabel={
            confirm.type === "delete" ? "Delete permanently" :
            confirm.type === "suspend" ? "Suspend" : "Reactivate"
          }
          danger={confirm.type === "delete"}
          onConfirm={() => {
            if (confirm.type === "suspend") executeSuspend(confirm.member);
            else if (confirm.type === "reactivate") executeReactivate(confirm.member);
            else executeDelete(confirm.member);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}