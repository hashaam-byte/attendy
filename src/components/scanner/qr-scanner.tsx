"use client";
// src/components/scanner/qr-scanner.tsx — ATTENDY-EDU v4
// FIXED: gateman login → scanner page showed an infinite loading
// spinner with nothing visible. html5-qrcode's `.start()` promise can
// hang indefinitely on some Android browsers while waiting for the
// camera permission prompt (especially if the prompt was dismissed or
// blocked previously, or if running in an insecure (non-HTTPS) context
// where getUserMedia silently never resolves).
//
// Fix: race `.start()` against an 8-second timeout. If it times out,
// show an actionable error instead of an endless spinner. Also
// explicitly check `navigator.mediaDevices` availability first, which
// is the most common real cause (non-HTTPS or unsupported browser).

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  onScan: (qrCode: string) => void;
  onError?: (error: string) => void;
  active?: boolean;
}

export default function QRScanner({ onScan, onError, active = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!active) return;

    // Reset per attempt
    startedRef.current = false;
    setCameraError(null);
    setInitializing(true);

    const containerId = "qr-scanner-container";

    // ── Pre-flight checks ──────────────────────────────────────
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera API unavailable. This usually means the page is not loaded over HTTPS, " +
        "or your browser doesn't support camera access. Try opening this page with https:// " +
        "or use a different browser (Chrome on Android recommended)."
      );
      setInitializing(false);
      return;
    }

    startedRef.current = true;
    const scanner = new Html5Qrcode(containerId, { verbose: false });
    scannerRef.current = scanner;

    // ── Race start() against a timeout so we never hang forever ──
    let settled = false;
    const timeoutMs = 8000;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      setCameraError(
        "Camera is taking too long to start. This often means a camera permission " +
        "prompt is waiting for a response, or no camera was found. Please allow camera " +
        "access when prompted, then tap Retry."
      );
      setInitializing(false);
      // Best-effort cleanup of a hung start
      scanner.stop().catch(() => {});
    }, timeoutMs);

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => onScan(decodedText),
        undefined
      )
      .then(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        setInitializing(false);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        const msg = String(err);
        setCameraError(
          msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("notallowed")
            ? "Camera access denied. Please allow camera permissions for this site in your browser settings, then tap Retry."
            : msg.toLowerCase().includes("notfound") || msg.toLowerCase().includes("no camera")
            ? "No camera found on this device. Connect a camera or try a different device."
            : `Camera error: ${msg}`
        );
        setInitializing(false);
        onError?.(msg);
      });

    return () => {
      clearTimeout(timeoutId);
      startedRef.current = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      try {
        scannerRef.current?.clear();
      } catch {}
    };
  }, [active, retryKey]);

  if (cameraError) {
    return (
      <div className="w-full h-64 flex items-center justify-center rounded-2xl p-5 text-center" style={{ background: "rgba(0,0,0,0.3)" }}>
        <div>
          <AlertTriangle size={28} className="mx-auto mb-3" style={{ color: "#fbbf24" }} />
          <p className="text-sm font-semibold mb-2" style={{ color: "#f87171" }}>Camera Error</p>
          <p className="text-xs leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>{cameraError}</p>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <RefreshCw size={13} /> Retry Camera
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full relative">
      {initializing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl" style={{ background: "rgba(0,0,0,0.35)" }}>
          <div className="text-center">
            <Camera size={24} className="mx-auto mb-2 animate-pulse" style={{ color: "rgba(255,255,255,0.6)" }} />
            <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>Starting camera…</p>
            <p className="text-[10px] font-mono mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Allow camera access if prompted</p>
          </div>
        </div>
      )}
      <div id="qr-scanner-container" className="w-full" />
    </div>
  );
}
