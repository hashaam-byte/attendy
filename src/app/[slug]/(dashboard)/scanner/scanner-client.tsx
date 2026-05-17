"use client";
// src/app/[slug]/(dashboard)/scanner/scanner-client.tsx — ATTENDY-EDU v3
// OFFLINE DUPLICATE FIX:
//   A second IndexedDB store "scanned_today" acts as a local ledger.
//   Key: "orgId:memberId:YYYY-MM-DD"  Value: { scanned_at, name }
//   Written immediately on EVERY successful scan (online OR offline).
//   Checked FIRST in handleScan, before any network call.
//   This means:
//     - Offline scans block re-scanning the same student immediately
//     - When back online, the ledger still blocks re-scan even before sync
//     - The server check is a second layer for cross-device safety
//   Ledger entries are keyed by date so they auto-expire the next day.

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle, Clock, XCircle, AlertCircle, Loader2,
  ScanLine, Wifi, WifiOff, Users, LogOut, Volume2, VolumeX,
  ShieldOff, Zap, Activity,
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
      <div className="w-full h-64 flex items-center justify-center bg-black/40 rounded-2xl">
        <div className="text-center" style={{ color: "var(--sc-accent)" }}>
          <Loader2 size={28} className="animate-spin mx-auto mb-2" />
          <p className="text-xs font-mono tracking-wider opacity-70">INITIALISING CAMERA</p>
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

type LocalScanRecord = {
  scanned_at: string;  // ISO string
  name: string;
  status: string;
};

// ── IndexedDB ────────────────────────────────────────────────────
// DB version 2 — adds the "scanned_today" object store.
// We bump from v1 → v2 so the onupgradeneeded handler runs on existing devices.
const DB_NAME    = "attendy_offline_v3";   // renamed to force fresh DB (v1 had no scanned_today)
const QUEUE_STORE  = "scan_queue";
const LEDGER_STORE = "scanned_today";      // local duplicate prevention ledger

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      // Queue store — autoIncrement key
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { autoIncrement: true });
      }
      // Ledger store — key is "orgId:memberId:YYYY-MM-DD"
      if (!db.objectStoreNames.contains(LEDGER_STORE)) {
        db.createObjectStore(LEDGER_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

// ── Queue helpers ────────────────────────────────────────────────
async function queueScan(scan: QueuedScan) {
  const db = await openDB();
  return new Promise<void>((res) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).add(scan);
    tx.oncomplete = () => res();
  });
}

async function getQueuedScans(): Promise<{ key: IDBValidKey; value: QueuedScan }[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const results: { key: IDBValidKey; value: QueuedScan }[] = [];
    tx.objectStore(QUEUE_STORE).openCursor().onsuccess = (e: Event) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) { results.push({ key: cursor.key, value: cursor.value as QueuedScan }); cursor.continue(); }
      else resolve(results);
    };
  });
}

async function deleteQueuedScan(key: IDBValidKey) {
  const db = await openDB();
  return new Promise<void>((res) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).delete(key);
    tx.oncomplete = () => res();
  });
}

// ── Ledger helpers ───────────────────────────────────────────────
// Key pattern: "orgId:memberId:YYYY-MM-DD"
// This makes entries implicitly expire — yesterday's keys are never matched.

function ledgerKey(orgId: string, memberId: string): string {
  const today = new Date().toISOString().split("T")[0]; // "2025-05-17"
  return `${orgId}:${memberId}:${today}`;
}

async function ledgerGet(orgId: string, memberId: string): Promise<LocalScanRecord | null> {
  try {
    const db  = await openDB();
    const key = ledgerKey(orgId, memberId);
    return new Promise((resolve) => {
      const tx  = db.transaction(LEDGER_STORE, "readonly");
      const req = tx.objectStore(LEDGER_STORE).get(key);
      req.onsuccess = () => resolve((req.result as LocalScanRecord) ?? null);
      req.onerror   = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function ledgerSet(orgId: string, memberId: string, record: LocalScanRecord) {
  try {
    const db  = await openDB();
    const key = ledgerKey(orgId, memberId);
    return new Promise<void>((res) => {
      const tx = db.transaction(LEDGER_STORE, "readwrite");
      tx.objectStore(LEDGER_STORE).put(record, key);
      tx.oncomplete = () => res();
    });
  } catch {}
}

// Purge ledger entries from previous days to keep IndexedDB tidy.
// Called once on component mount.
async function purgeStaleLedgerEntries() {
  try {
    const db    = await openDB();
    const today = new Date().toISOString().split("T")[0];
    return new Promise<void>((res) => {
      const tx    = db.transaction(LEDGER_STORE, "readwrite");
      const store = tx.objectStore(LEDGER_STORE);
      store.openCursor().onsuccess = (e: Event) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const key = String(cursor.key);
          // Key ends with the date. If it's not today's date, delete it.
          if (!key.endsWith(today)) cursor.delete();
          cursor.continue();
        } else res();
      };
    });
  } catch {}
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

// ── Scan result config ──────────────────────────────────────────
const RESULT_CONFIG = {
  success: {
    bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.35)", glow: "#22c55e",
    icon: CheckCircle, iconColor: "#4ade80", label: "✓ On Time", labelColor: "#4ade80",
    flash: "rgba(34,197,94,0.15)",
  },
  late: {
    bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.35)", glow: "#f59e0b",
    icon: Clock, iconColor: "#fbbf24", label: "Late Arrival", labelColor: "#fbbf24",
    flash: "rgba(251,191,36,0.12)",
  },
  duplicate: {
    bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.35)", glow: "#60a5fa",
    icon: AlertCircle, iconColor: "#93c5fd", label: "Already Scanned", labelColor: "#93c5fd",
    flash: "rgba(96,165,250,0.1)",
  },
  suspended: {
    bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.3)", glow: "#f59e0b",
    icon: ShieldOff, iconColor: "#fbbf24", label: "⚠ Suspended", labelColor: "#fbbf24",
    flash: "rgba(251,191,36,0.1)",
  },
  error: {
    bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.35)", glow: "#ef4444",
    icon: XCircle, iconColor: "#f87171", label: "Error", labelColor: "#f87171",
    flash: "rgba(239,68,68,0.1)",
  },
  unknown: {
    bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.3)", glow: "#64748b",
    icon: XCircle, iconColor: "#94a3b8", label: "Not Found", labelColor: "#94a3b8",
    flash: "rgba(100,116,139,0.08)",
  },
} as const;

export function ScannerClient({
  orgId, orgName, orgSlug, role, userId, primaryColor, settings, isPublicScanner = false,
}: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const [scanResult,   setScanResult]   = useState<ScanResult | null>(null);
  const [processing,   setProcessing]   = useState(false);
  const [isOnline,     setIsOnline]     = useState(true);
  const [scanCount,    setScanCount]    = useState(0);
  const [cachedMembers, setCachedMembers] = useState<CachedMember[]>([]);
  const [queuedCount,  setQueuedCount]  = useState(0);
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateReason,   setLateReason]   = useState("");
  const [pendingLate,  setPendingLate]  = useState<{ memberId: string; name: string } | null>(null);
  const [currentTime,  setCurrentTime]  = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [flashColor,   setFlashColor]   = useState<string | null>(null);
  const [recentScans,  setRecentScans]  = useState<{ name: string; status: string; time: string }[]>([]);

  const lastScannedRef      = useRef<string>("");
  const lastScannedTimeRef  = useRef<number>(0);
  const clearTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getCutoff = useCallback(() => {
    const startTime = settings.start_time || "07:30";
    const grace     = settings.grace_period_minutes ?? 15;
    const [h, m]    = startTime.split(":").map(Number);
    const now       = new Date();
    const cutoff    = new Date(now);
    cutoff.setHours(h, m + grace, 0, 0);
    return cutoff;
  }, [settings]);

  // Live clock
  useEffect(() => {
    const tick = () => setCurrentTime(
      new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Online/offline listeners
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

  // Cache all members (active + inactive) — no is_active filter
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("members")
        .select("id, full_name, class_name, parent_phone, organisation_id, is_active, qr_code")
        .eq("organisation_id", orgId)
        .eq("member_type", "student");
      if (data) setCachedMembers(data as CachedMember[]);
    })();
  }, [orgId]);

  // Load queue count + purge stale ledger entries on mount
  useEffect(() => {
    getQueuedScans().then((q) => setQueuedCount(q.length));
    purgeStaleLedgerEntries();
  }, []);

  // ── Sync offline queue to server ──────────────────────────────
  // Note: we do NOT remove ledger entries on sync — the ledger is the
  // source of truth for today's duplicate prevention regardless of sync state.
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
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      } else if (type === "late") {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
      } else if (type === "warning") {
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

  function flash(color: string) {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 800);
  }

  function clearResult() {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => setScanResult(null), 5000);
  }

  // ── Main scan handler ─────────────────────────────────────────
  async function handleScan(qrCode: string) {
    if (processing) return;

    // Raw debounce — same QR code within 3s from the camera stream
    const now = Date.now();
    if (qrCode === lastScannedRef.current && now - lastScannedTimeRef.current < 3000) return;
    lastScannedRef.current     = qrCode;
    lastScannedTimeRef.current = now;

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    setProcessing(true);
    setScanResult(null);

    try {
      // 1. Resolve member from cache (all members, active + inactive)
      let member: CachedMember | null = cachedMembers.find((m) => m.qr_code === qrCode) ?? null;

      if (!member && isOnline) {
        const { data } = await supabase
          .from("members")
          .select("id, full_name, class_name, parent_phone, organisation_id, is_active, qr_code")
          .eq("qr_code", qrCode)
          .eq("organisation_id", orgId)
          .maybeSingle();
        member = data as CachedMember | null;
      }

      // 2. Not found (deleted student or wrong school)
      if (!member) {
        playBeep("error");
        flash(RESULT_CONFIG.unknown.flash);
        setScanResult({ type: "unknown", name: "Student Not Found", time: new Date().toLocaleTimeString(), message: "QR code not registered in this school." });
        setProcessing(false); clearResult(); return;
      }

      // 3. Suspended
      if (!member.is_active) {
        playBeep("warning");
        flash(RESULT_CONFIG.suspended.flash);
        setScanResult({ type: "suspended", name: member.full_name, className: member.class_name ?? undefined, time: new Date().toLocaleTimeString(), message: "Student suspended. Access denied. Contact school admin." });
        setProcessing(false); clearResult(); return;
      }

      // ── 4. LOCAL LEDGER CHECK — works online AND offline ─────
      // This is the primary duplicate gate. It runs before any network call.
      const localRecord = await ledgerGet(orgId, member.id);
      if (localRecord) {
        playBeep("error");
        flash(RESULT_CONFIG.duplicate.flash);
        setScanResult({
          type:      "duplicate",
          name:      member.full_name,
          className: member.class_name ?? undefined,
          time:      new Date().toLocaleTimeString(),
          message:   `Already scanned today at ${formatTime(localRecord.scanned_at)}`,
        });
        setProcessing(false); clearResult(); return;
      }

      // ── 5. SERVER DUPLICATE CHECK — online only, cross-device safety ──
      // e.g. student scanned on a different tablet earlier today
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
          // Also write to local ledger so future offline checks catch it too
          await ledgerSet(orgId, member.id, {
            scanned_at: existing[0].scanned_at,
            name:       member.full_name,
            status:     "present",
          });
          playBeep("error");
          flash(RESULT_CONFIG.duplicate.flash);
          setScanResult({
            type:      "duplicate",
            name:      member.full_name,
            className: member.class_name ?? undefined,
            time:      new Date().toLocaleTimeString(),
            message:   `Already scanned today at ${formatTime(existing[0].scanned_at)}`,
          });
          setProcessing(false); clearResult(); return;
        }
      }

      // 6. Late check
      const isLate = new Date() > getCutoff();
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

  // ── Record scan — writes to ledger FIRST, then server/queue ──
  async function recordScan(
    member: CachedMember,
    status: "present" | "late",
    reason: string,
    scannedAt: string,
  ) {
    // ── Write to local ledger IMMEDIATELY ────────────────────
    // This must happen before anything async so that even if the
    // app crashes right after, the ledger is already set.
    await ledgerSet(orgId, member.id, {
      scanned_at: scannedAt,
      name:       member.full_name,
      status,
    });

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
        // Server insert failed — queue it for later
        await queueScan(scanData);
        setQueuedCount((c) => c + 1);
      } else {
        // Fire-and-forget parent notification
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
      // Offline — queue for sync when back online
      await queueScan(scanData);
      setQueuedCount((c) => c + 1);
    }

    const cfg         = RESULT_CONFIG[status === "present" ? "success" : "late"];
    const resultTime  = new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });

    playBeep(status === "present" ? "success" : "late");
    flash(cfg.flash);
    setScanCount((c) => c + 1);
    setScanResult({
      type:       status === "present" ? "success" : "late",
      name:       member.full_name,
      className:  member.class_name ?? undefined,
      time:       resultTime,
      lateReason: reason || undefined,
    });
    setRecentScans((prev) => [
      { name: member.full_name, status, time: resultTime },
      ...prev.slice(0, 4),
    ]);
    clearResult();
  }

  async function submitLateReason() {
    if (!pendingLate) return;
    setProcessing(true);
    const member: CachedMember = cachedMembers.find((m) => m.id === pendingLate.memberId) ?? {
      id: pendingLate.memberId, full_name: pendingLate.name,
      class_name: null, parent_phone: null,
      organisation_id: orgId, is_active: true, qr_code: "",
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

  const startTime = settings.start_time || "07:30";
  const grace     = settings.grace_period_minutes ?? 15;
  const [sh, sm]  = startTime.split(":").map(Number);
  const totalM    = sh * 60 + sm + grace;
  const ch        = Math.floor(totalM / 60), cm = totalM % 60;
  const cutoffStr = `${ch}:${String(cm).padStart(2, "0")} ${ch >= 12 ? "PM" : "AM"}`;
  const currentResult = scanResult ? RESULT_CONFIG[scanResult.type] : null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "#040c06",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        "--sc-accent": primaryColor,
        "--sc-accent-20": `${primaryColor}20`,
        "--sc-accent-40": `${primaryColor}40`,
      } as any}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes scanLineDown { 0%{top:0;opacity:0} 5%{opacity:1} 45%{top:50%;opacity:1} 50%{top:50%;opacity:0} 100%{top:50%;opacity:0} }
        @keyframes scanLineUp { 0%{bottom:0;opacity:0} 5%{opacity:1} 45%{bottom:50%;opacity:1} 50%{bottom:50%;opacity:0} 100%{bottom:50%;opacity:0} }
        @keyframes cornerPulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes resultSlideUp { from{opacity:0;transform:translateY(16px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 0 0 var(--glow-color,transparent)} 50%{box-shadow:0 0 24px 4px var(--glow-color,transparent)} }
        @keyframes dotBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes countUp { from{transform:translateY(6px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes flashBg { 0%{opacity:1} 100%{opacity:0} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .sc-scanner-box { position:relative; border-radius:20px; overflow:hidden; background:#000; aspect-ratio:1; }
        .sc-scan-line-down { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--sc-accent),transparent); animation:scanLineDown 2.4s ease-in-out infinite; box-shadow:0 0 8px var(--sc-accent); }
        .sc-scan-line-up { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--sc-accent),transparent); animation:scanLineUp 2.4s ease-in-out infinite; animation-delay:0.1s; box-shadow:0 0 8px var(--sc-accent); }
        .sc-corner { position:absolute; width:24px; height:24px; animation:cornerPulse 2s ease-in-out infinite; }
        .sc-corner--tl { top:10px; left:10px; border-top:2.5px solid var(--sc-accent); border-left:2.5px solid var(--sc-accent); border-radius:4px 0 0 0; }
        .sc-corner--tr { top:10px; right:10px; border-top:2.5px solid var(--sc-accent); border-right:2.5px solid var(--sc-accent); border-radius:0 4px 0 0; animation-delay:0.3s; }
        .sc-corner--bl { bottom:10px; left:10px; border-bottom:2.5px solid var(--sc-accent); border-left:2.5px solid var(--sc-accent); border-radius:0 0 0 4px; animation-delay:0.6s; }
        .sc-corner--br { bottom:10px; right:10px; border-bottom:2.5px solid var(--sc-accent); border-right:2.5px solid var(--sc-accent); border-radius:0 0 4px 0; animation-delay:0.9s; }
        .sc-result-card { animation:resultSlideUp 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .sc-overlay-fade { animation:flashBg 0.8s ease-out both; }
        .sc-recent-item { animation:countUp 0.3s ease both; }
        .sc-processing-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; border-radius:20px; backdrop-filter:blur(2px); }
      `}</style>

      {/* Background gradient */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${primaryColor}0e 0%, transparent 60%)` }} />

      {/* Flash overlay */}
      {flashColor && (
        <div className="sc-overlay-fade fixed inset-0 pointer-events-none z-50" style={{ background: flashColor }} />
      )}

      {/* Topbar */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(4,12,6,0.92)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${primaryColor}25`, padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: primaryColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ScanLine size={16} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", lineHeight: 1 }}>{orgName}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: "monospace", color: isOnline ? "#4ade80" : "#f87171" }}>
                {isOnline ? <Wifi size={9} /> : <WifiOff size={9} />}
                {isOnline ? "Online" : "Offline"}
              </span>
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>·</span>
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>{currentTime}</span>
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>·</span>
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>Late after {cutoffStr}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {queuedCount > 0 && (
            <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 6, padding: "2px 8px" }}>
              {queuedCount} queued
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: "monospace", color: primaryColor, fontWeight: 700 }}>
            <Users size={12} />{scanCount}
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)} style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", color: soundEnabled ? primaryColor : "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <ThemeToggle compact />
          {!isPublicScanner && (
            <button onClick={handleSignOut} style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", color: "rgba(248,113,113,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogOut size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ background: "linear-gradient(90deg, #92400e, #78350f)", color: "#fef3c7", textAlign: "center", fontSize: 12, fontWeight: 600, padding: "8px 16px", letterSpacing: "0.02em" }}>
          📡 Offline mode — scans are queued locally and will sync on reconnect. Duplicate protection is active.
        </div>
      )}

      {/* Main content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "20px 16px 40px", gap: 16, maxWidth: 440, margin: "0 auto", width: "100%" }}>

        {/* Scanner box */}
        <div style={{ width: "100%", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "14px 14px 0 0", border: `1px solid ${primaryColor}25`, borderBottom: "none" }}>
            <span style={{ position: "relative", width: 8, height: 8, display: "inline-block", flexShrink: 0 }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: processing ? "#fbbf24" : primaryColor, animation: "dotBlink 1.2s ease-in-out infinite" }} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.06em", color: processing ? "#fbbf24" : "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
              {processing ? "Processing…" : "Ready to scan"}
            </span>
          </div>

          <div className="sc-scanner-box" style={{ borderRadius: "0 0 20px 20px", border: `1px solid ${primaryColor}30`, borderTop: "none" }}>
            <Html5QrScanner onScan={handleScan} active={!processing && !showLateModal} />

            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {!processing && (
                <>
                  <div className="sc-scan-line-down" />
                  <div className="sc-scan-line-up" />
                </>
              )}
              <div className="sc-corner sc-corner--tl" />
              <div className="sc-corner sc-corner--tr" />
              <div className="sc-corner sc-corner--bl" />
              <div className="sc-corner sc-corner--br" />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 40, height: 40, opacity: 0.15 }}>
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: primaryColor, transform: "translateY(-50%)" }} />
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: primaryColor, transform: "translateX(-50%)" }} />
              </div>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, transparent 55%, rgba(0,0,0,0.5) 100%)" }} />
              {processing && (
                <div className="sc-processing-overlay">
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${primaryColor}20`, border: `2px solid ${primaryColor}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", animation: "glowPulse 1s ease-in-out infinite", "--glow-color": `${primaryColor}40` } as any}>
                      <Loader2 size={24} style={{ color: primaryColor, animation: "spin 0.8s linear infinite" }} />
                    </div>
                    <p style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>PROCESSING</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scan result */}
        {scanResult && currentResult && (() => {
          const ResultIcon = currentResult.icon;
          return (
            <div className="sc-result-card" style={{ width: "100%", background: currentResult.bg, border: `1px solid ${currentResult.border}`, borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: `0 0 24px ${currentResult.glow}20` }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${currentResult.glow}15`, border: `1.5px solid ${currentResult.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 16px ${currentResult.glow}30` }}>
                <ResultIcon size={22} style={{ color: currentResult.iconColor }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: currentResult.labelColor, marginBottom: 2, letterSpacing: "0.04em" }}>{currentResult.label}</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.92)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{scanResult.name}</p>
                {scanResult.className && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{scanResult.className}</p>}
                {scanResult.message && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2, lineHeight: 1.5 }}>{scanResult.message}</p>}
                {scanResult.lateReason && <p style={{ fontSize: 11, color: "#fbbf24", marginTop: 2 }}>Reason: {scanResult.lateReason}</p>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: currentResult.iconColor }}>{scanResult.time}</p>
              </div>
            </div>
          );
        })()}

        {/* Recent scans */}
        {recentScans.length > 0 && (
          <div style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={12} style={{ color: primaryColor }} />
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Recent</span>
            </div>
            {recentScans.map((scan, i) => (
              <div key={i} className="sc-recent-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: i < recentScans.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", animationDelay: `${i * 0.05}s` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: scan.status === "present" ? "#4ade80" : "#fbbf24", boxShadow: `0 0 6px ${scan.status === "present" ? "#4ade80" : "#fbbf24"}` }} />
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scan.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: scan.status === "present" ? "#4ade80" : "#fbbf24", fontWeight: 600 }}>{scan.status === "present" ? "On time" : "Late"}</span>
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>{scan.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.18)", letterSpacing: "0.06em", textAlign: "center" }}>
          {scanCount} scan{scanCount !== 1 ? "s" : ""} this session · {cachedMembers.filter(m => m.is_active).length} students cached
        </p>
      </main>

      {/* Late reason modal */}
      {showLateModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 380, background: "#050f07", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: "1.5rem", animation: "resultSlideUp 0.3s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.25rem" }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={20} style={{ color: "#fbbf24" }} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 2 }}>Late Arrival</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{pendingLate?.name} · after {cutoffStr}</p>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Reason (optional)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                {LATE_REASONS.map((r) => (
                  <button key={r} onClick={() => setLateReason(lateReason === r ? "" : r)}
                    style={{ padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 500, border: `1px solid ${lateReason === r ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.08)"}`, background: lateReason === r ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.03)", color: lateReason === r ? "#fbbf24" : "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>
                    {r}
                  </button>
                ))}
              </div>
              <input
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontFamily: "'DM Sans', sans-serif", outline: "none" }}
                placeholder="Or type a custom reason…"
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowLateModal(false); setPendingLate(null); setProcessing(false); }}
                style={{ flex: 1, padding: "11px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button onClick={submitLateReason} disabled={processing}
                style={{ flex: 1, padding: "11px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "#b45309", border: "none", color: "white", cursor: processing ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: processing ? 0.7 : 1 }}>
                {processing ? <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Clock size={14} />}
                Record Late
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}