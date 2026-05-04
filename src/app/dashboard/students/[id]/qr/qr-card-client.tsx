"use client";

import { useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer } from "lucide-react";

type Student = {
  id: string;
  full_name: string;
  class_name: string | null;
  qr_code: string;
  employee_id: string | null;
};

export function QRCardClient({
  student,
  schoolName,
  primaryColor,
}: {
  student: Student;
  schoolName: string;
  primaryColor: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  async function handleDownload() {
    const canvas = cardRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    // Create a bigger canvas for download
    const scale = 3;
    const w = 280 * scale;
    const h = 380 * scale;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d")!;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Header
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, w, 80 * scale);

    // School name in header
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${14 * scale}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(schoolName.toUpperCase(), w / 2, 28 * scale);
    ctx.font = `${10 * scale}px Inter, sans-serif`;
    ctx.fillText("STUDENT ID CARD", w / 2, 46 * scale);

    // QR code
    ctx.drawImage(canvas, (w - 160 * scale) / 2, 90 * scale, 160 * scale, 160 * scale);

    // Student name
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${16 * scale}px Inter, sans-serif`;
    ctx.fillText(student.full_name, w / 2, 275 * scale);

    // Class
    ctx.fillStyle = "#64748b";
    ctx.font = `${12 * scale}px Inter, sans-serif`;
    ctx.fillText(student.class_name ?? "", w / 2, 295 * scale);

    // ID
    if (student.employee_id) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = `${10 * scale}px monospace`;
      ctx.fillText(student.employee_id, w / 2, 315 * scale);
    }

    // QR code value (short)
    ctx.fillStyle = "#cbd5e1";
    ctx.font = `${8 * scale}px monospace`;
    ctx.fillText(student.qr_code.slice(0, 12).toUpperCase(), w / 2, 340 * scale);

    // Download
    const url = out.toDataURL("image/png", 1.0);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student.full_name.replace(/\s+/g, "-")}-QR-card.png`;
    a.click();
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={handleDownload} className="btn-primary flex-1 justify-center">
          <Download size={15} />
          Download PNG
        </button>
        <button onClick={handlePrint} className="btn-secondary flex-1 justify-center">
          <Printer size={15} />
          Print
        </button>
      </div>

      {/* Card preview */}
      <div className="flex justify-center">
        <div
          ref={cardRef}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
          style={{
            width: 280,
            boxShadow: `0 8px 32px ${primaryColor}30`,
            border: `2px solid ${primaryColor}20`,
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 text-center"
            style={{ background: primaryColor }}
          >
            <p className="text-white font-bold text-sm uppercase tracking-wide">
              {schoolName}
            </p>
            <p className="text-white/70 text-[10px] uppercase tracking-widest mt-0.5">
              Student ID Card
            </p>
          </div>

          {/* QR code */}
          <div className="flex justify-center py-5 px-5">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
              <QRCodeCanvas
                value={student.qr_code}
                size={160}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
                includeMargin={false}
              />
            </div>
          </div>

          {/* Details */}
          <div className="px-5 pb-5 text-center">
            <p className="font-bold text-slate-900 text-base leading-tight">
              {student.full_name}
            </p>
            {student.class_name && (
              <p className="text-slate-500 text-sm mt-1">{student.class_name}</p>
            )}
            {student.employee_id && (
              <p className="text-slate-400 text-xs font-mono mt-1">
                {student.employee_id}
              </p>
            )}
            <p className="text-slate-300 text-[10px] font-mono mt-2 tracking-widest">
              {student.qr_code.slice(0, 16).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 dark:text-[#4a7a5a]">
        Print on cardstock or laminate for durability. Each QR code is unique to this student.
      </p>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #qr-print-area, #qr-print-area * { visibility: visible !important; }
          #qr-print-area { position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; z-index: 9999 !important; }
        }
      `}</style>
    </div>
  );
}