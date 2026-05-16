"use client";
// src/app/[slug]/(dashboard)/scanner/scanner-client.tsx — ATTENDY-EDU v3
// KEY CHANGES from previous version:
//   - Member lookup no longer filters by is_active — fetches ALL so we can
//     distinguish "suspended" (found, inactive) from "deleted" (not found).
//   - New scan result type: "suspended"
//   - resultConfig extended with suspended entry (amber/warning style)

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle, Clock, XCircle, AlertCircle, Loader2,
  ScanLine, Wifi, WifiOff, Users, LogOut, Volume2, VolumeX,
  ShieldOff,
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Html5QrScanner = dynamic(
  () => import("@/components/scanner/qr-scanner"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-60 flex items-center justify-center bg-black/20 rounded-xl">
        <div className="text-center text-green-400">
          <Loader2 size={28} className="animate-spin mx-auto mb-2" />
          <p className="text-xs font-mono">Initialising camera…</p>
        </div>
      </div>
    ),
  }
);

type ScanResult = {
  type: "success" | "late" | "duplicate" | "error" | "unknown" | "suspended";
  name: string;
  className?: string;
  time: string;
  message?: string;
  lateReason?: string;
};

type CachedMember = {
  id: string;
  full_name: string;
  class_name: string | null;
  parent_phone: string | null;
  organisation_id: string;
  is_active: boolean;
  qr_code: string;
};

type QueuedScan = {
  organisation_id: string;
  member_id: string;
  scan_type: "entry";
  status: "present" | "late";
  late_reason: string | null;
  device_id: string;
  scanned_at: string;
  queued_at: string;
};

// ── IndexedDB helpers ────────────────────────────────────────────
const DB_NAME = "attendy_offline_v2";
const STORE = "scan_queue";

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueScan(scan: QueuedScan) {
  const db = await openDB();
  return new Promise<void>((res) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(scan);
    tx.oncomplete = () => res();
  });
}

async function getQueuedScans(): Promise<{ key: IDBValidKey; value: QueuedScan }[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const results: { key: IDBValidKey; value: QueuedScan }[] = [];
    tx.objectStore(STORE).openCursor().onsuccess = (e: Event) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        results.push({ key: cursor.key, value: cursor.value as QueuedScan });
        cursor.continue();
      } else resolve(results);
    };
  });
}

async function deleteQueuedScan(key: IDBValidKey) {
  const db = await openDB();
  return new Promise<void>((res) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => res();
  });
}

const LATE_REASONS = ["Traffic", "Overslept", "Family issue", "Medical", "School bus delay", "Other"];

interface OrgSettings {
  start_time?: string;
  grace_period_minutes?: number;
}

interface Props {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: string;
  userId: string;
  primaryColor: string;
  settings: OrgSettings;
  isPublicScanner?: boolean;
}

export function ScannerClient({
  orgId, orgName, orgSlug, role, userId, primaryColor, settings, isPublicScanner = false,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  // Cache includes ALL members (active + inactive) so we can detect suspended
  const [cachedMembers, setCachedMembers] = useState<CachedMember[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateReason, setLateReason] = useState("");
  const [pendingLate, setPendingLate] = useState<{ memberId: string; name: string } | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastScannedRef = useRef<string>("");
  const lastScannedTimeRef = useRef<number>(0);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getCutoff = useCallback(() => {
    const startTime = settings.start_time || "07:30";
    const grace = settings.grace_period_minutes ?? 15;
    const [h, m] = startTime.split(":").map(Number);
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(h, m + grace, 0, 0);
    return cutoff;
  }, [settings]);

  // Live clock
  useEffect(() => {
    const tick = () =>
      setCurrentTime(
        new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Online/offline
  useEffect(() => {
    const onOnline  = () => { setIsOnline(true); syncQueue(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Cache ALL members (active AND inactive) so scanner can detect suspension
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("members")
        .select("id, full_name, class_name, parent_phone, organisation_id, is_active, qr_code")
        .eq("organisation_id", orgId)
        .eq("member_type", "student");
      // No is_active filter — we need both to distinguish suspended from deleted
      if (data) setCachedMembers(data as CachedMember[]);
    })();
  }, [orgId]);

  useEffect(() => {
    getQueuedScans().then((q) => setQueuedCount(q.length));
  }, []);

  async function syncQueue() {
    const queued = await getQueuedScans();
    for (const { key, value } of queued) {
      try {
        const { error } = await supabase.from("attendance_logs").insert({
          organisation_id: value.organisation_id,
          member_id:       value.member_id,
          scan_type:       "entry",
          status:          value.status,
          late_reason:     value.late_reason,
          device_id:       "scanner-offline",
          scanned_at:      value.scanned_at,
        });
        if (!error) await deleteQueuedScan(key);
      } catch {}
    }
    const remaining = await getQueuedScans();
    setQueuedCount(remaining.length);
  }

  function playBeep(type: "success" | "late" | "error" | "warning") {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const ctx  = new AudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(880,  ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      } else if (type === "late") {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
      } else if (type === "warning") {
        // Two-tone warning for suspended
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
      }

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }

  function clearResult() {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    // Suspended/error cards stay visible a bit longer
    clearTimerRef.current = setTimeout(() => setScanResult(null), 5000);
  }

  async function handleScan(qrCode: string) {
    if (processing) return;
    const now = Date.now();
    if (qrCode === lastScannedRef.current && now - lastScannedTimeRef.current < 3000) return;
    lastScannedRef.current     = qrCode;
    lastScannedTimeRef.current = now;
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    setProcessing(true);
    setScanResult(null);

    try {
      // ── Look up member from cache (no is_active filter) ──────
      let member: CachedMember | null =
        cachedMembers.find((m) => m.qr_code === qrCode) ?? null;

      // If not in cache and online, fetch WITHOUT is_active filter
      if (!member && isOnline) {
        const { data } = await supabase
          .from("members")
          .select("id, full_name, class_name, parent_phone, organisation_id, is_active, qr_code")
          .eq("qr_code", qrCode)
          .eq("organisation_id", orgId)
          .maybeSingle();
        member = data as CachedMember | null;
      }

      // ── Not found at all — deleted / wrong school ────────────
      if (!member) {
        playBeep("error");
        setScanResult({
          type: "unknown",
          name: "Student Not Found",
          time: new Date().toLocaleTimeString(),
          message: "This QR code is not registered in this school.",
        });
        setProcessing(false);
        clearResult();
        return;
      }

      // ── Found but suspended ──────────────────────────────────
      if (!member.is_active) {
        playBeep("warning");
        setScanResult({
          type: "suspended",
          name: member.full_name,
          className: member.class_name ?? undefined,
          time: new Date().toLocaleTimeString(),
          message: "This student has been suspended. Access denied. Please contact the school admin.",
        });
        setProcessing(false);
        clearResult();
        return;
      }

      // ── Duplicate check (online only) ────────────────────────
      if (isOnline) {
        const todayStart = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("attendance_logs")
          .select("id, scanned_at")
          .eq("member_id", member.id)
          .eq("organisation_id", orgId)
          .eq("scan_type", "entry")
          .gte("scanned_at", `${todayStart}T00:00:00`)
          .limit(1);

        if (existing && existing.length > 0) {
          playBeep("error");
          setScanResult({
            type:    "duplicate",
            name:    member.full_name,
            className: member.class_name ?? undefined,
            time:    new Date().toLocaleTimeString(),
            message: `Already scanned at ${formatTime(existing[0].scanned_at)}`,
          });
          setProcessing(false);
          clearResult();
          return;
        }
      }

      // ── Late check ───────────────────────────────────────────
      const cutoff = getCutoff();
      const isLate = new Date() > cutoff;

      if (isLate) {
        setPendingLate({ memberId: member.id, name: member.full_name });
        setShowLateModal(true);
        setProcessing(false);
        return;
      }

      await recordScan(member, "present", "", new Date().toISOString());
    } catch (err) {
      console.error("Scan error:", err);
      playBeep("error");
      setScanResult({ type: "error", name: "Error", time: new Date().toLocaleTimeString(), message: "Something went wrong. Try again." });
      clearResult();
    }
    setProcessing(false);
  }

  async function recordScan(
    member: CachedMember,
    status: "present" | "late",
    reason: string,
    scannedAt: string
  ) {
    const scanData: QueuedScan = {
      organisation_id: orgId,
      member_id:       member.id,
      scan_type:       "entry",
      status,
      late_reason:     reason || null,
      device_id:       "scanner-web",
      scanned_at:      scannedAt,
      queued_at:       new Date().toISOString(),
    };

    if (isOnline) {
      const { error } = await supabase.from("attendance_logs").insert({
        organisation_id: scanData.organisation_id,
        member_id:       scanData.member_id,
        scan_type:       scanData.scan_type,
        status:          scanData.status,
        late_reason:     scanData.late_reason,
        device_id:       scanData.device_id,
        scanned_at:      scanData.scanned_at,
      });

      if (error) {
        await queueScan(scanData);
        setQueuedCount((c) => c + 1);
      } else {
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type:        "arrival",
            member_id:   member.id,
            org_id:      orgId,
            is_late:     status === "late",
            late_reason: reason,
          }),
        }).catch(() => {});
      }
    } else {
      await queueScan(scanData);
      setQueuedCount((c) => c + 1);
    }

    playBeep(status === "present" ? "success" : "late");
    setScanCount((c) => c + 1);
    setScanResult({
      type:       status === "present" ? "success" : "late",
      name:       member.full_name,
      className:  member.class_name ?? undefined,
      time:       new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
      lateReason: reason || undefined,
    });
    clearResult();
  }

  async function submitLateReason() {
    if (!pendingLate) return;
    setProcessing(true);
    const member: CachedMember = cachedMembers.find((m) => m.id === pendingLate.memberId) ?? {
      id:              pendingLate.memberId,
      full_name:       pendingLate.name,
      class_name:      null,
      parent_phone:    null,
      organisation_id: orgId,
      is_active:       true,
      qr_code:         "",
    };
    await recordScan(member, "late", lateReason, new Date().toISOString());
    setShowLateModal(false);
    setPendingLate(null);
    setLateReason("");
    setProcessing(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push(`/${orgSlug}/login`);
  }

  // ── Result display config ────────────────────────────────────
  const resultConfig = {
    success: {
      bg:        "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700/50",
      icon:      CheckCircle,
      iconColor: "text-green-600 dark:text-green-400",
      label:     "✓ On Time",
      labelColor:"text-green-700 dark:text-green-300",
    },
    late: {
      bg:        "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50",
      icon:      Clock,
      iconColor: "text-amber-600 dark:text-amber-400",
      label:     "Late Arrival",
      labelColor:"text-amber-700 dark:text-amber-300",
    },
    duplicate: {
      bg:        "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700/50",
      icon:      AlertCircle,
      iconColor: "text-blue-600 dark:text-blue-400",
      label:     "Already Scanned",
      labelColor:"text-blue-700 dark:text-blue-300",
    },
    suspended: {
      bg:        "bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600/60",
      icon:      ShieldOff,
      iconColor: "text-amber-600 dark:text-amber-400",
      label:     "⚠ Student Suspended",
      labelColor:"text-amber-700 dark:text-amber-300",
    },
    error: {
      bg:        "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700/50",
      icon:      XCircle,
      iconColor: "text-red-600 dark:text-red-400",
      label:     "Error",
      labelColor:"text-red-700 dark:text-red-300",
    },
    unknown: {
      bg:        "bg-slate-50 dark:bg-slate-950/30 border-slate-300 dark:border-slate-700/50",
      icon:      XCircle,
      iconColor: "text-slate-600 dark:text-slate-400",
      label:     "Student Not Found",
      labelColor:"text-slate-700 dark:text-slate-300",
    },
  };

  // Cutoff display
  const startTime = settings.start_time || "07:30";
  const grace     = settings.grace_period_minutes ?? 15;
  const [sh, sm]  = startTime.split(":").map(Number);
  const totalM    = sh * 60 + sm + grace;
  const ch        = Math.floor(totalM / 60);
  const cm        = totalM % 60;
  const cutoffStr = `${ch}:${String(cm).padStart(2, "0")} ${ch >= 12 ? "PM" : "AM"}`;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] bg-white dark:bg-[#0c1a12]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
            <ScanLine size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{orgName}</p>
            <div className="flex items-center gap-2">
              <span className={cn("flex items-center gap-1 text-[10px] font-mono",
                isOnline ? "text-green-600 dark:text-green-400" : "text-red-500")}>
                {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                {isOnline ? "Online" : "Offline"}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-[#4a7a5a] font-mono">{currentTime}</span>
              <span className="text-[10px] text-slate-400 dark:text-[#4a7a5a] font-mono">· Late after {cutoffStr}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {queuedCount > 0 && (
            <span className="badge-amber text-[10px] font-mono">{queuedCount} queued</span>
          )}
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-green-300">
            <Users size={13} />{scanCount}
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-green-950/30 transition-colors"
            title={soundEnabled ? "Mute" : "Unmute"}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <ThemeToggle compact />
          {!isPublicScanner && (
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs py-2 px-4 text-center font-medium">
          📡 Offline — scans are being queued and will sync when you reconnect
        </div>
      )}

      {/* Scanner */}
      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-6 space-y-4">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] bg-green-50 dark:bg-green-950/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                processing ? "bg-amber-400" : "bg-green-400")} />
              <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5",
                processing ? "bg-amber-500" : "bg-green-500")} />
            </span>
            <span className="text-xs font-medium text-green-700 dark:text-green-300">
              {processing ? "Processing…" : "Scanner ready — hold QR card up to camera"}
            </span>
          </div>

          <div className="bg-black relative">
            <Html5QrScanner onScan={handleScan} active={!processing && !showLateModal} />
            {processing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-green-400" />
              </div>
            )}
          </div>
        </div>

        {/* Scan result */}
        {scanResult && (() => {
          const cfg  = resultConfig[scanResult.type];
          const Icon = cfg.icon;
          return (
            <div className={cn(
              "card p-4 border flex items-start gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
              cfg.bg
            )}>
              <div className="w-12 h-12 rounded-full bg-white/60 dark:bg-black/20 flex items-center justify-center shrink-0">
                <Icon size={24} className={cfg.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-bold", cfg.labelColor)}>{cfg.label}</p>
                <p className="text-base font-semibold text-slate-900 dark:text-white truncate">{scanResult.name}</p>
                {scanResult.className && (
                  <p className="text-xs text-slate-500 dark:text-[#6b9e7a]">{scanResult.className}</p>
                )}
                {scanResult.message && (
                  <p className="text-xs text-slate-600 dark:text-[#6b9e7a] mt-0.5 leading-relaxed">{scanResult.message}</p>
                )}
                {scanResult.lateReason && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Reason: {scanResult.lateReason}</p>
                )}
                <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-0.5 font-mono">{scanResult.time}</p>
              </div>
            </div>
          );
        })()}

        <div className="text-center text-xs text-slate-400 dark:text-[#4a7a5a] font-mono">
          {scanCount} scan{scanCount !== 1 ? "s" : ""} this session · {cachedMembers.filter(m => m.is_active).length} active students cached
        </div>
      </div>

      {/* Late reason modal */}
      {showLateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Late Arrival</h3>
                <p className="text-xs text-slate-500 dark:text-[#6b9e7a]">{pendingLate?.name} · after {cutoffStr}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-2">
                Reason <span className="text-slate-400">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {LATE_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setLateReason(lateReason === r ? "" : r)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                      lateReason === r
                        ? "bg-amber-100 dark:bg-amber-900/30 border-amber-400 text-amber-700 dark:text-amber-300"
                        : "border-[#bbf7d0] dark:border-[#1a3a24] text-slate-600 dark:text-green-300 hover:bg-amber-50"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                className="input-base text-xs"
                placeholder="Or type a custom reason…"
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowLateModal(false); setPendingLate(null); setProcessing(false); }}
                className="btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={submitLateReason}
                disabled={processing}
                className="btn-primary flex-1 justify-center bg-amber-600 hover:bg-amber-700"
              >
                {processing ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                Record Late
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}