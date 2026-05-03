"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle, Clock, XCircle, AlertCircle, Loader2,
  ScanLine, Wifi, WifiOff, Users, LogOut,
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Html5QrScanner = dynamic(() => import("@/components/scanner/qr-scanner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-60 flex items-center justify-center bg-black/20 rounded-xl">
      <div className="text-center text-green-400">
        <Loader2 size={28} className="animate-spin mx-auto mb-2" />
        <p className="text-xs font-mono">Initialising camera…</p>
      </div>
    </div>
  ),
});

type ScanResult = {
  type: "success" | "late" | "duplicate" | "error" | "unknown";
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

// IndexedDB helpers
const DB_NAME = "attendy_offline";
const STORE_NAME = "scan_queue";

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME, { autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueScan(scan: QueuedScan) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).add(scan);
}

async function getQueuedScans(): Promise<{ key: IDBValidKey; value: QueuedScan }[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const results: { key: IDBValidKey; value: QueuedScan }[] = [];
    store.openCursor().onsuccess = (e: Event) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        results.push({ key: cursor.key, value: cursor.value as QueuedScan });
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
}

async function deleteQueuedScan(key: IDBValidKey) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(key);
}

const LATE_REASONS = ["Traffic", "Overslept", "Family issue", "Medical", "Other"];

export function ScannerClient({
  orgId,
  orgName,
  role,
  userId,
}: {
  orgId: string;
  orgName: string;
  role: string;
  userId: string;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [cachedMembers, setCachedMembers] = useState<CachedMember[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateReason, setLateReason] = useState("");
  const [pendingLate, setPendingLate] = useState<{ memberId: string; name: string } | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const lastScannedRef = useRef<string>("");
  const lastScannedTimeRef = useRef<number>(0);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live clock
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => { setIsOnline(true); syncQueue(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cache member list on load
  useEffect(() => {
    async function loadMembers() {
      const { data } = await supabase
        .from("members")
        .select("id, full_name, class_name, parent_phone, organisation_id, is_active, qr_code")
        .eq("organisation_id", orgId)
        .eq("is_active", true)
        .eq("member_type", "student");
      if (data) setCachedMembers(data as CachedMember[]);
    }
    loadMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function updateQueueCount() {
    const q = await getQueuedScans();
    setQueuedCount(q.length);
  }

  useEffect(() => { updateQueueCount(); }, []);

  async function syncQueue() {
    const queued = await getQueuedScans();
    for (const { key, value } of queued) {
      try {
        await supabase.from("attendance_logs").insert({
          organisation_id: value.organisation_id,
          member_id: value.member_id,
          scan_type: "entry",
          status: value.status,
          late_reason: value.late_reason ?? null,
          device_id: "scanner-offline",
          scanned_at: value.scanned_at,
        });
        await deleteQueuedScan(key);
      } catch {
        // Continue trying other queued items
      }
    }
    updateQueueCount();
  }

  function clearResult() {
    clearTimerRef.current = setTimeout(() => setScanResult(null), 3000);
  }

  async function handleScan(qrCode: string) {
    if (processing) return;

    const now = Date.now();
    if (qrCode === lastScannedRef.current && now - lastScannedTimeRef.current < 3000) return;
    lastScannedRef.current = qrCode;
    lastScannedTimeRef.current = now;

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    setProcessing(true);
    setScanResult(null);

    try {
      // Find member from cache first (works offline)
      let member: CachedMember | null = cachedMembers.find((m) => m.qr_code === qrCode) ?? null;

      if (!member && isOnline) {
        const { data } = await supabase
          .from("members")
          .select("id, full_name, class_name, parent_phone, organisation_id, is_active, qr_code")
          .eq("qr_code", qrCode)
          .eq("organisation_id", orgId)
          .single();
        member = data as CachedMember | null;
      }

      if (!member) {
        setScanResult({ type: "unknown", name: "Unknown QR", time: new Date().toLocaleTimeString() });
        setProcessing(false);
        clearResult();
        return;
      }

      if (!member.is_active) {
        setScanResult({
          type: "error",
          name: member.full_name,
          className: member.class_name ?? undefined,
          time: new Date().toLocaleTimeString(),
          message: "Student is inactive",
        });
        setProcessing(false);
        clearResult();
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      if (isOnline) {
        const { data: existing } = await supabase
          .from("attendance_logs")
          .select("id, scanned_at")
          .eq("member_id", member.id)
          .eq("organisation_id", orgId)
          .eq("scan_type", "entry")
          .gte("scanned_at", `${today}T00:00:00`)
          .limit(1);

        if (existing && existing.length > 0) {
          setScanResult({
            type: "duplicate",
            name: member.full_name,
            className: member.class_name ?? undefined,
            time: new Date().toLocaleTimeString(),
            message: `Already checked in at ${formatTime(existing[0].scanned_at)}`,
          });
          setProcessing(false);
          clearResult();
          return;
        }
      }

      // Late check: after 8:00 AM
      const nowDate = new Date();
      const cutoff = new Date(nowDate);
      cutoff.setHours(8, 0, 0, 0);
      const isLate = nowDate > cutoff;

      if (isLate) {
        setPendingLate({ memberId: member.id, name: member.full_name });
        setShowLateModal(true);
        setProcessing(false);
        return;
      }

      await recordScan(member, "present", "", new Date().toISOString());
    } catch {
      setScanResult({
        type: "error",
        name: "Error",
        time: new Date().toLocaleTimeString(),
        message: "Something went wrong. Try again.",
      });
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
      member_id: member.id,
      scan_type: "entry",
      status,
      late_reason: reason || null,
      device_id: "scanner-web",
      scanned_at: scannedAt,
      queued_at: new Date().toISOString(),
    };

    if (isOnline) {
      const { error } = await supabase.from("attendance_logs").insert({
        organisation_id: scanData.organisation_id,
        member_id: scanData.member_id,
        scan_type: scanData.scan_type,
        status: scanData.status,
        late_reason: scanData.late_reason,
        device_id: scanData.device_id,
        scanned_at: scanData.scanned_at,
      });
      if (error) {
        await queueScan(scanData);
        updateQueueCount();
      } else {
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "arrival",
            member_id: member.id,
            org_id: orgId,
            is_late: status === "late",
            late_reason: reason,
          }),
        }).catch(() => {});
      }
    } else {
      await queueScan(scanData);
      updateQueueCount();
    }

    setScanCount((c) => c + 1);
    setScanResult({
      type: status,
      name: member.full_name,
      className: member.class_name ?? undefined,
      time: new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
      lateReason: reason || undefined,
    });
    clearResult();
  }

  async function submitLateReason() {
    if (!pendingLate) return;
    setProcessing(true);

    const member: CachedMember = cachedMembers.find((m) => m.id === pendingLate.memberId) ?? {
      id: pendingLate.memberId,
      full_name: pendingLate.name,
      class_name: null,
      parent_phone: null,
      organisation_id: orgId,
      is_active: true,
      qr_code: "",
    };

    await recordScan(member, "late", lateReason, new Date().toISOString());

    setShowLateModal(false);
    setPendingLate(null);
    setLateReason("");
    setProcessing(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const resultConfig: Record<ScanResult["type"], {
    bg: string;
    icon: React.ElementType;
    iconColor: string;
    label: string;
    labelColor: string;
  }> = {
    success: { bg: "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700/50", icon: CheckCircle, iconColor: "text-green-600 dark:text-green-400", label: "On Time", labelColor: "text-green-700 dark:text-green-300" },
    late:    { bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50", icon: Clock, iconColor: "text-amber-600 dark:text-amber-400", label: "Late", labelColor: "text-amber-700 dark:text-amber-300" },
    duplicate: { bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700/50", icon: AlertCircle, iconColor: "text-blue-600 dark:text-blue-400", label: "Already Scanned", labelColor: "text-blue-700 dark:text-blue-300" },
    error:   { bg: "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700/50", icon: XCircle, iconColor: "text-red-600 dark:text-red-400", label: "Error", labelColor: "text-red-700 dark:text-red-300" },
    unknown: { bg: "bg-slate-50 dark:bg-slate-950/30 border-slate-300 dark:border-slate-700/50", icon: XCircle, iconColor: "text-slate-600 dark:text-slate-400", label: "Unknown QR", labelColor: "text-slate-700 dark:text-slate-300" },
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      {/* Scanner topbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] bg-white dark:bg-[#0c1a12]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
            <ScanLine size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{orgName}</p>
            <div className="flex items-center gap-2">
              <span className={cn(
                "flex items-center gap-1 text-[10px] font-mono",
                isOnline ? "text-green-600 dark:text-green-400" : "text-red-500"
              )}>
                {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                {isOnline ? "Online" : "Offline"}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-[#4a7a5a] font-mono">{currentTime}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {queuedCount > 0 && (
            <span className="badge-amber text-[10px] font-mono">
              {queuedCount} queued
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-green-300">
            <Users size={13} />
            {scanCount}
          </div>
          <ThemeToggle compact />
          <button onClick={handleSignOut} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs py-2 px-4 text-center font-medium">
          📡 Offline mode — scans are being queued and will sync when you reconnect
        </div>
      )}

      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-6 space-y-4">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#bbf7d0] dark:border-[#1a3a24] bg-green-50 dark:bg-green-950/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs font-medium text-green-700 dark:text-green-300">
              {processing ? "Processing scan…" : "Scanner ready — hold QR card up to camera"}
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

        {scanResult && (() => {
          const cfg = resultConfig[scanResult.type];
          const Icon = cfg.icon;
          return (
            <div className={cn("card p-4 border flex items-start gap-4 animate-in fade-in-0 duration-300", cfg.bg)}>
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
                  <p className="text-xs text-slate-500 dark:text-[#6b9e7a] mt-0.5">{scanResult.message}</p>
                )}
                <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-0.5 font-mono">{scanResult.time}</p>
              </div>
            </div>
          );
        })()}

        <div className="text-center text-xs text-slate-400 dark:text-[#4a7a5a] font-mono">
          {scanCount} scan{scanCount !== 1 ? "s" : ""} logged today · {cachedMembers.length} students cached
        </div>
      </div>

      {showLateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Late Arrival</h3>
                <p className="text-xs text-slate-500 dark:text-[#6b9e7a]">{pendingLate?.name}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-green-200 mb-2">
                Reason for lateness <span className="text-slate-400">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {LATE_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setLateReason(lateReason === r ? "" : r)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                      lateReason === r
                        ? "bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300"
                        : "border-[#bbf7d0] dark:border-[#1a3a24] text-slate-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                className="input-base"
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