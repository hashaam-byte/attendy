"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

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

  useEffect(() => {
    if (!active || startedRef.current) return;

    const containerId = "qr-scanner-container";
    startedRef.current = true;

    const scanner = new Html5Qrcode(containerId, { verbose: false });
    scannerRef.current = scanner;

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
      .catch((err) => {
        setCameraError("Camera access denied. Please allow camera permissions and reload.");
        onError?.(String(err));
      });

    return () => {
      startedRef.current = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [active]);

  if (cameraError) {
    return (
      <div className="w-full h-60 flex items-center justify-center bg-black/20 rounded-xl p-4 text-center">
        <div>
          <p className="text-red-400 text-sm font-medium mb-2">Camera Error</p>
          <p className="text-slate-400 text-xs">{cameraError}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <div id="qr-scanner-container" className="w-full" />
    </div>
  );
}