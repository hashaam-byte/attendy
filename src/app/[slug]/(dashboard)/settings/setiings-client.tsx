"use client";
// src/app/[slug]/(dashboard)/settings/setiings-client.tsx — ATTENDY-EDU v5
// Theme-safe throughout (CSS variables only, no hardcoded dark colours).
// ClassAssignmentPanel now wired into the Staff section.
// Termii test button added to Notifications section.

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  School, Clock, Bell, Users, CreditCard, Save as SaveIcon, Loader2,
  Camera, CheckCircle, AlertTriangle, Trash2, X,
  UserCheck, ShieldOff, KeyRound, ChevronRight,
  UserPlus, Copy, Eye, EyeOff, BookOpen,
  AlertCircle, Send, Wifi, Lock, MessageCircle, Crown,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { PLAN_LIMITS, type PlanType } from "@/lib/types";
import { hasFeature, minPlanFor } from "@/lib/plan-features";
import { createClient } from "@/lib/supabase/client";
import { ClassAssignmentPanel } from "./class-assignements";

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
  assignments?: string[];
}

interface Props {
  org: any;
  staff: StaffMember[];
  classes: string[];
  currentUserId: string;
  slug: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Card section wrapper ───────────────────────────────────────
function Section({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--accent-bg)" }}>
          {icon}
        </div>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Toggle row ─────────────────────────────────────────────────
function ToggleRow({ label, desc, value, onChange }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-10 h-5 rounded-full transition-colors shrink-0"
        style={{ backgroundColor: value ? "var(--accent)" : "var(--border)" }}
        role="switch"
        aria-checked={value}
      >
        <span
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
          style={{ left: value ? 18 : 2 }}
        />
      </button>
    </div>
  );
}

// ── Confirm dialog ─────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string;
  danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 space-y-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: danger ? "var(--status-danger-bg)" : "var(--status-warning-bg)" }}>
            <AlertTriangle size={18} style={{ color: danger ? "var(--status-danger)" : "var(--status-warning)" }} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{message}</p>
          </div>
          <button onClick={onCancel} style={{ color: "var(--icon-default)" }}><X size={14} /></button>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center text-xs">Cancel</button>
          <button
            onClick={onConfirm}
            className="flex-1 justify-center inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-medium transition-all"
            style={{ backgroundColor: danger ? "var(--status-danger)" : "var(--status-warning)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Staff Modal ────────────────────────────────────────────
function AddStaffModal({ orgId, orgSlug, onClose, onAdded }: {
  orgId: string; orgSlug: string;
  onClose: () => void; onAdded: (member: StaffMember) => void;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("teacher");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; password: string; smsSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const defaultPassword = `${orgSlug}123`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError(null);
    const res = await fetch("/api/create-school-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password: defaultPassword, role, organisation_id: orgId, org_name: orgSlug, phone: phone.trim() || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to create user."); return; }
    setResult({ email: email.trim().toLowerCase(), password: defaultPassword, smsSent: data.sms_sent ?? false });
    onAdded({ id: `temp-${Date.now()}`, user_id: data.user.id, email: email.trim().toLowerCase(), role, is_active: true, created_at: new Date().toISOString() });
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
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--accent-bg)" }}>
              <UserPlus size={14} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Add Staff Member</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Creates a login for the school portal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--icon-default)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--accent-bg)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}>
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2" style={{ color: "var(--status-success)" }}>
                <CheckCircle size={18} />
                <span className="text-sm font-semibold">Account created successfully!</span>
              </div>
              {result.smsSent && (
                <div className="p-3 rounded-lg text-xs" style={{ background: "var(--status-success-bg)", color: "var(--status-success)" }}>
                  ✓ Login credentials sent to their phone via SMS.
                </div>
              )}
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Share these credentials with the staff member. Ask them to log in and change their password immediately.
              </p>
              <div className="rounded-xl p-4 space-y-3 font-mono text-xs border" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
                {[
                  { label: "School ID", value: orgSlug },
                  { label: "Email", value: result.email },
                  { label: "Password", value: showPassword ? result.password : "••••••••",
                    action: <button onClick={() => setShowPassword(v => !v)} style={{ color: "var(--icon-default)" }}>{showPassword ? <EyeOff size={11} /> : <Eye size={11} />}</button> },
                  { label: "Login URL", value: `attendy-edu.vercel.app/${orgSlug}/login` },
                ].map(({ label, value, action }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span style={{ color: "var(--text-faint)" }}>{label}</span>
                    <div className="flex items-center gap-1 text-right">
                      <span className="truncate max-w-50" style={{ color: "var(--text-primary)" }}>{value}</span>
                      {action}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg text-xs" style={{ background: "var(--status-warning-bg)", color: "var(--status-warning)" }}>
                💡 Remind them: Settings → Change My Password after first login.
              </div>
              <div className="flex gap-2">
                <button onClick={copyCredentials} className="btn-secondary flex-1 justify-center text-xs">
                  {copied ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy All</>}
                </button>
                <button onClick={onClose} className="btn-primary flex-1 justify-center text-xs">Done</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 rounded-lg text-xs space-y-1" style={{ background: "var(--accent-bg)", border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
                <p className="font-semibold">Default password: <span className="font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--accent-bg-strong)" }}>{defaultPassword}</span></p>
                <p style={{ color: "var(--text-muted)" }}>Staff member should change it after first login.</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email address <span className="text-red-500">*</span></label>
                <input type="email" className="input-base" placeholder="teacher@school.edu.ng" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Phone number <span style={{ color: "var(--text-faint)" }}>(optional — for SMS)</span></label>
                <input type="tel" className="input-base" placeholder="08012345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Role <span className="text-red-500">*</span></label>
                <div className="space-y-2">
                  {[
                    { value: "admin",   label: "Admin",   desc: "Full dashboard — students, reports, settings, staff" },
                    { value: "teacher", label: "Teacher", desc: "Class attendance + view reports for their class" },
                    { value: "gateman", label: "Gateman", desc: "Scanner only — goes straight to scanner on login" },
                  ].map(({ value, label, desc }) => (
                    <label key={value} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                      style={{ borderColor: role === value ? "var(--accent)" : "var(--border)", background: role === value ? "var(--accent-bg)" : "transparent" }}>
                      <input type="radio" name="staff-role" value={value} checked={role === value} onChange={() => setRole(value)} className="mt-0.5 accent-green-600" />
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {error && <div className="p-3 rounded-lg text-sm" style={{ background: "var(--status-danger-bg)", color: "var(--status-danger)" }}>{error}</div>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading || !email} className="btn-primary flex-1 justify-center">
                  {loading ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : <><UserPlus size={13} /> Create Login</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main SettingsClient ────────────────────────────────────────
export function SettingsClient({ org, staff: initialStaff, classes, currentUserId, slug }: Props) {
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
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(org?.logo_url || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Termii test state
  const [termiiStatus, setTermiiStatus] = useState<any>(null);
  const [termiiChecking, setTermiiChecking] = useState(false);
  const [termiiTestPhone, setTermiiTestPhone] = useState("");
  const [termiiTesting, setTermiiTesting] = useState(false);
  const [termiiTestResult, setTermiiTestResult] = useState<any>(null);

  type ConfirmState = { type: "suspend" | "reactivate" | "delete"; member: StaffMember } | null;
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  async function saveSettings() {
    setSavingSettings(true); setSettingsSaved(false); setSettingsSaveError(null);
    const res = await fetch("/api/org-settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
      router.refresh();
    } else {
      // Plan-lock or other server-side rejection (e.g. WhatsApp toggled on
      // without a qualifying plan) — revert the toggle locally and show why.
      if (data?.code === "PLAN_FEATURE_LOCKED" && data?.feature === "whatsappNotifications") {
        setSettings((s) => ({ ...s, whatsapp_notifications: false }));
      }
      setSettingsSaveError(data?.error ?? "Failed to save settings.");
    }
    setSavingSettings(false);
  }

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
      const { error: uploadError } = await supabase.storage.from("org-logos").upload(path, logoFile, { upsert: true, contentType: logoFile.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("org-logos").getPublicUrl(path);
      const res = await fetch("/api/org-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logo_url: publicUrl }) });
      if (res.ok) { setLogoSaved(true); setTimeout(() => setLogoSaved(false), 3000); router.refresh(); }
    } catch (err) { console.error("Logo upload failed:", err); }
    setUploadingLogo(false);
  }

  async function removeLogo() {
    await fetch("/api/org-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logo_url: null }) });
    setLogoPreview(null); setLogoFile(null); router.refresh();
  }

  async function checkTermii() {
    setTermiiChecking(true); setTermiiStatus(null);
    const res = await fetch("/api/termii-check");
    const data = await res.json();
    setTermiiStatus(data);
    setTermiiChecking(false);
  }

  async function testTermiiSms() {
    if (!termiiTestPhone.trim()) return;
    setTermiiTesting(true); setTermiiTestResult(null);
    const res = await fetch("/api/termii-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: termiiTestPhone }) });
    const data = await res.json();
    setTermiiTestResult(data);
    setTermiiTesting(false);
  }

  async function executeStaffAction(member: StaffMember, type: "suspend" | "reactivate" | "delete") {
    setActionLoading(member.id);
    if (type === "delete") {
      const res = await fetch(`/api/manage-staff?org_user_id=${encodeURIComponent(member.id)}`, { method: "DELETE" });
      if (res.ok) setStaffList(prev => prev.filter(s => s.id !== member.id));
    } else {
      const res = await fetch("/api/manage-staff", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ org_user_id: member.id, is_active: type === "reactivate" }) });
      if (res.ok) setStaffList(prev => prev.map(s => s.id === member.id ? { ...s, is_active: type === "reactivate" } : s));
    }
    setActionLoading(null); setConfirm(null); setExpandedStaffId(null);
  }

  function toggleDay(day: number) {
    setSettings(s => ({
      ...s,
      school_days: s.school_days.includes(day)
        ? s.school_days.filter(d => d !== day)
        : [...s.school_days, day].sort(),
    }));
  }

  const planLimit = PLAN_LIMITS[org?.plan as PlanType] ?? PLAN_LIMITS.trial;
  const planExpiry = org?.plan_expires_at ? new Date(org.plan_expires_at) : null;
  const isExpiringSoon = planExpiry ? planExpiry < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : false;
  const whatsappAllowed = hasFeature(org?.plan, "whatsappNotifications");
  const whatsappMinPlan = minPlanFor("whatsappNotifications");

  const SaveBtn = ({ label = "Save Changes" }: { label?: string }) => (
    <button onClick={saveSettings} disabled={savingSettings} className="btn-primary text-xs py-1.5">
      {savingSettings ? <Loader2 size={12} className="animate-spin" /> : settingsSaved ? <CheckCircle size={12} /> : <SaveIcon size={12} />}
      {settingsSaved ? "Saved!" : label}
    </button>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="page-title">Settings</h2>
        <p className="page-sub">School configuration and account management</p>
      </div>

      {/* ── School Logo ── */}
      <Section title="School Logo" icon={<Camera size={15} style={{ color: "var(--accent)" }} />}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Appears on the login page, dashboard, QR cards, and all school-facing pages.
        </p>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0" style={{ borderColor: "var(--border-strong)", background: "var(--bg-subtle)" }}>
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
              : <School size={28} style={{ color: "var(--text-faint)" }} />}
          </div>
          <div className="space-y-2 flex-1">
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoSelect} className="hidden" />
            <button onClick={() => logoInputRef.current?.click()} className="btn-secondary text-xs w-full justify-center">
              {logoPreview ? "Change Logo" : "Upload Logo"}
            </button>
            {logoFile && (
              <button onClick={uploadLogo} disabled={uploadingLogo} className="btn-primary text-xs w-full justify-center">
                {uploadingLogo ? <><Loader2 size={12} className="animate-spin" />Uploading…</> : logoSaved ? <><CheckCircle size={12} />Saved!</> : <><SaveIcon size={12} />Save Logo</>}
              </button>
            )}
            {logoPreview && org?.logo_url && !logoFile && (
              <button onClick={removeLogo} className="btn-secondary text-xs w-full justify-center" style={{ color: "var(--status-danger)" }}>
                <Trash2 size={12} />Remove Logo
              </button>
            )}
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>PNG, JPG, or SVG. Recommended: 200×200px square.</p>
      </Section>

      {/* ── Attendance Rules ── */}
      <Section title="Attendance Rules" icon={<Clock size={15} style={{ color: "var(--accent)" }} />}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Configure when school starts and how late is determined.</p>
          <SaveBtn />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>School Start Time</label>
            <input type="time" className="input-base" value={settings.start_time}
              onChange={(e) => setSettings(s => ({ ...s, start_time: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Grace Period: <span style={{ color: "var(--accent)" }}>{settings.grace_period_minutes} min</span>
            </label>
            <input type="range" min={0} max={60} step={5} value={settings.grace_period_minutes}
              onChange={(e) => setSettings(s => ({ ...s, grace_period_minutes: Number(e.target.value) }))}
              className="w-full accent-green-600" />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>
              <span>0 min</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>Late after {(() => {
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
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>School Days</label>
          <div className="flex gap-1.5">
            {DAYS.map((day, i) => (
              <button key={day} onClick={() => toggleDay(i)}
                className="flex-1 py-2 rounded-lg text-xs font-medium border transition-all"
                style={settings.school_days.includes(i) ? {
                  background: "var(--accent)", borderColor: "var(--accent)", color: "white",
                } : {
                  borderColor: "var(--border)", color: "var(--text-muted)",
                }}>
                {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Absence Alert Time</label>
          <input type="time" className="input-base max-w-50" value={settings.absence_alert_time}
            onChange={(e) => setSettings(s => ({ ...s, absence_alert_time: e.target.value }))} />
          <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
            If a student hasn't scanned by this time, an absence SMS fires to their parent.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Term Start Date</label>
            <input type="date" className="input-base" value={settings.term_start_date || ""}
              onChange={(e) => setSettings(s => ({ ...s, term_start_date: e.target.value || null }))} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Term End Date</label>
            <input type="date" className="input-base" value={settings.term_end_date || ""}
              onChange={(e) => setSettings(s => ({ ...s, term_end_date: e.target.value || null }))} />
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          Term dates are used to calculate per-student attendance percentages in reports and the parent portal.
        </p>

        <div className="pt-2">
          <SaveBtn label="Save Attendance Rules" />
        </div>
      </Section>

      {/* ── Notifications ── */}
      <Section title="Notifications & SMS" icon={<Bell size={15} style={{ color: "var(--accent)" }} />}>
        <div className="space-y-1 divide-y" style={{ borderColor: "var(--border)" }}>
          <ToggleRow label="SMS on arrival" desc="Text parent when student scans in at the gate"
            value={settings.sms_on_arrival} onChange={(v) => setSettings(s => ({ ...s, sms_on_arrival: v }))} />
          <div className="pt-1">
            <ToggleRow label="SMS on absence" desc={`Text parent if student hasn't arrived by ${settings.absence_alert_time}`}
              value={settings.sms_on_absence} onChange={(v) => setSettings(s => ({ ...s, sms_on_absence: v }))} />
          </div>
        </div>

        {settingsSaveError && (
          <div className="flex items-start gap-2 p-3 rounded-lg text-xs" style={{ background: "var(--status-danger-bg)", color: "var(--status-danger)" }}>
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <span className="flex-1">{settingsSaveError}</span>
            <button onClick={() => setSettingsSaveError(null)} className="shrink-0"><X size={13} /></button>
          </div>
        )}

        <SaveBtn label="Save Notification Settings" />

        {/* ── WhatsApp notifications — plan-gated ── */}
        <div className="rounded-xl border p-4 space-y-3 mt-2" style={{
          borderColor: whatsappAllowed ? "var(--border-strong)" : "var(--border)",
          background: whatsappAllowed ? "var(--accent-bg)" : "var(--bg-subtle)",
        }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: whatsappAllowed ? "var(--accent-bg-strong)" : "var(--border)" }}>
                <MessageCircle size={14} style={{ color: whatsappAllowed ? "var(--accent)" : "var(--text-faint)" }} />
              </div>
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                  WhatsApp Notifications
                  {!whatsappAllowed && (
                    <span className="badge text-[9px] inline-flex items-center gap-1" style={{ background: "var(--accent-bg-strong)", color: "var(--accent)" }}>
                      <Crown size={9} /> {whatsappMinPlan.toUpperCase()}+
                    </span>
                  )}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Send arrival/absence alerts via WhatsApp instead of (or alongside) SMS through Termii.
                  WhatsApp messages are typically cheaper and have higher delivery rates than SMS.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!whatsappAllowed) return;
                setSettings(s => ({ ...s, whatsapp_notifications: !s.whatsapp_notifications }));
              }}
              disabled={!whatsappAllowed}
              className="relative w-10 h-5 rounded-full transition-colors shrink-0 disabled:cursor-not-allowed"
              style={{ backgroundColor: settings.whatsapp_notifications && whatsappAllowed ? "var(--accent)" : "var(--border)" }}
              role="switch"
              aria-checked={settings.whatsapp_notifications}
            >
              <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                style={{ left: settings.whatsapp_notifications && whatsappAllowed ? 18 : 2 }} />
              {!whatsappAllowed && (
                <Lock size={9} className="absolute top-1 left-1" style={{ color: "var(--text-faint)" }} />
              )}
            </button>
          </div>

          {!whatsappAllowed ? (
            <div className="flex items-center justify-between gap-3 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Your plan is <span className="font-semibold capitalize">{org?.plan ?? "trial"}</span>.
                Upgrade to <span className="font-semibold capitalize">{whatsappMinPlan}</span> or higher to unlock WhatsApp.
              </p>
              <a
                href="https://wa.me/2348077291745?text=Hi%20Attendy%2C%20I%27d%20like%20to%20upgrade%20to%20enable%20WhatsApp%20notifications"
                target="_blank" rel="noopener noreferrer"
                className="btn-primary text-xs py-1.5 shrink-0"
              >
                Upgrade →
              </a>
            </div>
          ) : settings.whatsapp_notifications ? (
            <div className="pt-1 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              ✓ Enabled. Messages will try WhatsApp first and automatically fall back to SMS if WhatsApp delivery fails
              (e.g. number not on WhatsApp, or your school's WhatsApp sender isn't approved by Termii yet).
            </div>
          ) : null}
        </div>

        {/* Termii diagnostic */}
        <div className="rounded-xl border p-4 space-y-3 mt-2" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Termii SMS Diagnostics</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Check your API key, balance, and sender ID</p>
            </div>
            <button onClick={checkTermii} disabled={termiiChecking} className="btn-secondary text-xs py-1.5">
              {termiiChecking ? <><Loader2 size={12} className="animate-spin" />Checking…</> : <><Wifi size={12} />Check Status</>}
            </button>
          </div>

          {termiiStatus && (
            <div className="rounded-lg p-3 text-xs space-y-2" style={{
              background: termiiStatus.ok ? "var(--status-success-bg)" : "var(--status-danger-bg)",
              color: termiiStatus.ok ? "var(--status-success)" : "var(--status-danger)",
            }}>
              <div className="flex items-start gap-2">
                {termiiStatus.ok ? <CheckCircle size={13} className="shrink-0 mt-0.5" /> : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
                <span className="font-medium">{termiiStatus.message}</span>
              </div>
              <div className="space-y-1 font-mono" style={{ color: "var(--text-secondary)" }}>
                {termiiStatus.balance !== null && <p>Balance: ₦{termiiStatus.balance}</p>}
                <p>Sender ID: {termiiStatus.sender_id} {termiiStatus.sender_id_registered ? "✓" : "✗ NOT REGISTERED"}</p>
                {termiiStatus.api_key_prefix && <p>API Key: {termiiStatus.api_key_prefix}</p>}
              </div>
              {(termiiStatus.tips ?? []).length > 0 && (
                <ul className="space-y-1 list-disc list-inside" style={{ color: "var(--text-secondary)" }}>
                  {termiiStatus.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Test SMS */}
          <div className="flex gap-2">
            <input
              className="input-base text-xs flex-1"
              placeholder="Phone to test (e.g. 08012345678)"
              value={termiiTestPhone}
              onChange={(e) => setTermiiTestPhone(e.target.value)}
            />
            <button onClick={testTermiiSms} disabled={termiiTesting || !termiiTestPhone.trim()} className="btn-secondary text-xs py-1.5 shrink-0">
              {termiiTesting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Test SMS
            </button>
          </div>
          {termiiTestResult && (
            <p className="text-xs px-1" style={{ color: termiiTestResult.ok ? "var(--status-success)" : "var(--status-danger)" }}>
              {termiiTestResult.ok
                ? `✓ Test SMS sent to ${termiiTestResult.to}! Check the phone.`
                : `✗ Failed: ${termiiTestResult.error}`
              }
              {termiiTestResult.tip && <span className="block mt-1" style={{ color: "var(--status-warning)" }}>Tip: {termiiTestResult.tip}</span>}
            </p>
          )}
        </div>
      </Section>

      {/* ── Subscription ── */}
      <Section title="Subscription" icon={<CreditCard size={15} style={{ color: "var(--accent)" }} />}>
        {isExpiringSoon && (
          <div className="flex items-start gap-2 p-3 rounded-lg text-xs" style={{ background: "var(--status-warning-bg)", color: "var(--status-warning)" }}>
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            Your plan expires on <strong>{formatDate(org?.plan_expires_at)}</strong>. Contact Attendy on WhatsApp to renew.
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Plan", value: <span className="capitalize">{org?.plan ?? "trial"}</span> },
            { label: "Max Students", value: planLimit.members === 99999 ? "∞" : planLimit.members },
            { label: "Expires", value: planExpiry ? formatDate(org?.plan_expires_at) : "Never" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3 text-center border" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{label}</p>
            </div>
          ))}
        </div>
        <a href="https://wa.me/2348077291745?text=Hi%20Attendy%2C%20I%20need%20to%20upgrade%20my%20school%20plan"
          target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs w-full justify-center">
          Upgrade Plan on WhatsApp →
        </a>
      </Section>

      {/* ── Staff Accounts ── */}
      <Section title="Staff Accounts" icon={<Users size={15} style={{ color: "var(--accent)" }} />}>
        <div className="flex items-center justify-between">
          <Link href={`/${slug}/settings/change-password`}
            className="flex items-center gap-2 text-xs font-medium hover:underline"
            style={{ color: "var(--accent)" }}>
            <KeyRound size={12} /> Change My Password
          </Link>
          <button onClick={() => setShowAddStaff(true)} className="btn-primary text-xs py-1.5 gap-1.5">
            <UserPlus size={13} /> Add Staff
          </button>
        </div>

        <div className="space-y-2">
          {staffList.length === 0 ? (
            <div className="py-8 text-center">
              <Users size={28} className="mx-auto mb-2" style={{ color: "var(--text-faint)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No staff accounts yet.</p>
            </div>
          ) : staffList.map((s) => {
            const isSelf = s.user_id === currentUserId;
            const isExpanded = expandedStaffId === s.id;
            const isActioning = actionLoading === s.id;

            return (
              <div key={s.id} className="rounded-xl border overflow-hidden transition-all"
                style={{ borderColor: isExpanded ? "var(--accent)" : "var(--border)", opacity: s.is_active ? 1 : 0.6 }}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  onClick={() => !isSelf && setExpandedStaffId(isExpanded ? null : s.id)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--accent-bg)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: s.role === "admin" ? "var(--accent-bg-strong)" : s.role === "teacher" ? "var(--status-info-bg)" : "var(--bg-subtle)",
                      color: s.role === "admin" ? "var(--accent)" : s.role === "teacher" ? "var(--status-info)" : "var(--text-muted)",
                    }}>
                    {(s.email ?? s.user_id)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {s.email ?? `${s.user_id.slice(0, 12)}…`}
                      {isSelf && <span className="ml-1.5 text-[10px] font-normal" style={{ color: "var(--accent)" }}>(you)</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="badge-gray capitalize">{s.role}</span>
                      {(s.assignments ?? []).length > 0 && (
                        <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                          {(s.assignments ?? []).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="badge text-[10px]" style={s.is_active ? { background: "var(--status-success-bg)", color: "var(--status-success)" } : { background: "var(--status-danger-bg)", color: "var(--status-danger)" }}>
                    {s.is_active ? "Active" : "Suspended"}
                  </span>
                  {!isSelf && (
                    <ChevronRight size={14} className={cn("transition-transform duration-200", isExpanded && "rotate-90")} style={{ color: "var(--icon-default)" }} />
                  )}
                </button>

                {isExpanded && !isSelf && (
                  <div className="px-4 py-3 border-t flex flex-wrap gap-2" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
                    {s.is_active ? (
                      <button onClick={() => setConfirm({ type: "suspend", member: s })} disabled={isActioning}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                        style={{ borderColor: "var(--status-warning)", color: "var(--status-warning)", background: "var(--status-warning-bg)" }}>
                        {isActioning ? <Loader2 size={11} className="animate-spin" /> : <ShieldOff size={11} />} Suspend
                      </button>
                    ) : (
                      <button onClick={() => setConfirm({ type: "reactivate", member: s })} disabled={isActioning}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                        style={{ borderColor: "var(--status-success)", color: "var(--status-success)", background: "var(--status-success-bg)" }}>
                        {isActioning ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />} Reactivate
                      </button>
                    )}
                    <button onClick={() => setConfirm({ type: "delete", member: s })} disabled={isActioning}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                      style={{ borderColor: "var(--status-danger)", color: "var(--status-danger)", background: "var(--status-danger-bg)" }}>
                      {isActioning ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete permanently
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Class Assignments ── (NOW WIRED IN) */}
      <Section title="Class Assignments" icon={<BookOpen size={15} style={{ color: "var(--accent)" }} />}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Assign teachers to the classes they teach. Teachers will only see students in their assigned classes on the "My Class" and class register pages.
        </p>
        <ClassAssignmentPanel
          staff={staffList}
          classes={classes}
          orgId={org?.id}
        />
      </Section>

      {/* ── School Info ── */}
      <Section title="School Details" icon={<School size={15} style={{ color: "var(--accent)" }} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "School Name", value: org?.name },
            { label: "School ID (slug)", value: org?.slug },
            { label: "Timezone", value: org?.timezone ?? "Africa/Lagos" },
            { label: "Scanner URL", value: `attendy-edu.vercel.app/scan/${org?.slug}` },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-lg border" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
              <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-faint)" }}>{label}</p>
              <p className="font-mono text-xs truncate" style={{ color: "var(--text-primary)" }}>{value ?? "—"}</p>
            </div>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          To change the school name, contact Attendy support on WhatsApp.
        </p>
      </Section>

      {/* Modals */}
      {showAddStaff && (
        <AddStaffModal orgId={org.id} orgSlug={slug}
          onClose={() => setShowAddStaff(false)}
          onAdded={(member) => setStaffList(prev => [member, ...prev])} />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.type === "delete" ? "Delete staff member permanently?" : confirm.type === "suspend" ? "Suspend staff access?" : "Reactivate staff member?"}
          message={confirm.type === "delete"
            ? `This will permanently remove ${confirm.member.email ?? "this user"} from Attendy. This cannot be undone.`
            : confirm.type === "suspend"
            ? `${confirm.member.email ?? "This user"} will no longer be able to log in. You can reactivate them any time.`
            : `${confirm.member.email ?? "This user"} will regain access to the school portal.`}
          confirmLabel={confirm.type === "delete" ? "Delete permanently" : confirm.type === "suspend" ? "Suspend" : "Reactivate"}
          danger={confirm.type === "delete"}
          onConfirm={() => executeStaffAction(confirm.member, confirm.type)}
          onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}
