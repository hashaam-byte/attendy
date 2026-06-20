"use client";
// src/app/[slug]/qr-cards/qr-card-client.tsx — ATTENDY-EDU v3
// Premium QR card designer — default matches the Greenfield College style:
// school logo top-left, school name, student photo circle, name/class/ID,
// large QR code on colored background, "Scan for Attendance" footer, motto bar

import { useState, useRef, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Download, Printer, Share2, RotateCcw, Loader2, Check,
  ChevronDown, ChevronRight, Upload, X, Palette, Layout,
  Type, Image as ImageIcon, Eye,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────
interface Student {
  id: string;
  full_name: string;
  class_name: string | null;
  qr_code: string;
  employee_id: string | null;
  is_active: boolean;
  photo_url?: string | null;
}

interface CardConfig {
  // Colors
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  bgColor: string;
  qrFgColor: string;
  qrBgColor: string;
  // Layout
  template: "classic" | "modern" | "minimal" | "bold";
  showPhoto: boolean;
  showLogo: boolean;
  showSchoolName: boolean;
  showTagline: boolean;
  showStudentId: boolean;
  showClassName: boolean;
  showFooterMotto: boolean;
  // Text
  tagline: string;
  footerMotto: string;
  scanLabel: string;
  // Sizes
  cardWidth: number;
  cardHeight: number;
  qrSize: number;
  borderRadius: number;
  // Images
  logoUrl: string;
  studentPhotoUrl: string;
  // Font
  fontFamily: string;
}

const DEFAULT_CONFIG: CardConfig = {
  primaryColor: "#166534",
  secondaryColor: "#15803d",
  textColor: "#0f172a",
  bgColor: "#ffffff",
  qrFgColor: "#0f172a",
  qrBgColor: "#ffffff",
  template: "classic",
  showPhoto: true,
  showLogo: true,
  showSchoolName: true,
  showTagline: true,
  showStudentId: true,
  showClassName: true,
  showFooterMotto: true,
  tagline: "Integrity & Excellence",
  footerMotto: "INTEGRITY  •  DISCIPLINE  •  EXCELLENCE",
  scanLabel: "Scan for Attendance",
  cardWidth: 320,
  cardHeight: 500,
  qrSize: 180,
  borderRadius: 20,
  logoUrl: "",
  studentPhotoUrl: "",
  fontFamily: "'Segoe UI', system-ui, sans-serif",
};

// ── Preset themes ─────────────────────────────────────────
const PRESETS: Record<string, Partial<CardConfig>> = {
  greenfield: {
    primaryColor: "#166534", secondaryColor: "#15803d",
    textColor: "#0f172a", bgColor: "#ffffff",
    qrFgColor: "#0f172a", qrBgColor: "#ffffff",
    template: "classic",
  },
  royal: {
    primaryColor: "#1e3a8a", secondaryColor: "#1d4ed8",
    textColor: "#0f172a", bgColor: "#ffffff",
    qrFgColor: "#1e3a8a", qrBgColor: "#eff6ff",
    template: "classic",
  },
  crimson: {
    primaryColor: "#991b1b", secondaryColor: "#b91c1c",
    textColor: "#0f172a", bgColor: "#ffffff",
    qrFgColor: "#7f1d1d", qrBgColor: "#fff1f2",
    template: "classic",
  },
  midnight: {
    primaryColor: "#0f172a", secondaryColor: "#1e293b",
    textColor: "#ffffff", bgColor: "#0f172a",
    qrFgColor: "#f1f5f9", qrBgColor: "#1e293b",
    template: "bold",
  },
  gold: {
    primaryColor: "#92400e", secondaryColor: "#b45309",
    textColor: "#0f172a", bgColor: "#fffbeb",
    qrFgColor: "#78350f", qrBgColor: "#fef3c7",
    template: "classic",
  },
  minimal: {
    primaryColor: "#374151", secondaryColor: "#6b7280",
    textColor: "#111827", bgColor: "#f9fafb",
    qrFgColor: "#111827", qrBgColor: "#ffffff",
    template: "minimal",
  },
};

// ── Storage ───────────────────────────────────────────────
function loadConfig(schoolSlug: string): CardConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(`attendy_card_v3_${schoolSlug}`);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch { return DEFAULT_CONFIG; }
}

function saveConfig(schoolSlug: string, cfg: CardConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `attendy_card_v3_${schoolSlug}`,
      JSON.stringify({ ...cfg, logoUrl: "", studentPhotoUrl: "" })
    );
  } catch {}
}

// ── Section accordion ─────────────────────────────────────
function Section({ title, icon, children, open: defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; open?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-green-400">{icon}</span>
        <span className="text-xs font-mono uppercase tracking-widest text-slate-400 flex-1">{title}</span>
        {open ? <ChevronDown size={12} className="text-slate-600" /> : <ChevronRight size={12} className="text-slate-600" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none" />
        <span className="text-xs font-mono text-slate-300">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={cn("w-9 h-5 rounded-full transition-colors relative", value ? "bg-green-600" : "bg-white/10")}
      >
        <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", value ? "left-4.5" : "left-0.5")} />
      </button>
    </div>
  );
}

// ── The actual card preview ───────────────────────────────
function CardPreview({
  cfg, student, schoolName, cardRef,
}: {
  cfg: CardConfig;
  student: Student;
  schoolName: string;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isMinimal = cfg.template === "minimal";
  const isBold = cfg.template === "bold";

  return (
    <div ref={cardRef} style={{ width: cfg.cardWidth, fontFamily: cfg.fontFamily }}>
      <div
        style={{
          width: cfg.cardWidth,
          minHeight: cfg.cardHeight,
          backgroundColor: cfg.bgColor,
          borderRadius: cfg.borderRadius,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* ── LANYARD HOLE ─────────────────────────────── */}
        <div style={{
          position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
          width: 28, height: 10, backgroundColor: "#e2e8f0",
          borderRadius: 5, zIndex: 10,
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
        }} />

        {/* ── HEADER — white section ────────────────────── */}
        <div style={{
          backgroundColor: cfg.bgColor,
          padding: "24px 20px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          borderBottom: `2px solid ${cfg.primaryColor}20`,
        }}>
          {/* Logo */}
          {cfg.showLogo && (
            <div style={{
              width: 52, height: 52, flexShrink: 0,
              borderRadius: 8, overflow: "hidden",
              backgroundColor: cfg.logoUrl ? "transparent" : `${cfg.primaryColor}15`,
              border: `2px solid ${cfg.primaryColor}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {cfg.logoUrl ? (
                <img src={cfg.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
              ) : (
                <svg viewBox="0 0 40 40" width={32} height={32} fill={cfg.primaryColor} opacity={0.8}>
                  <path d="M20 4L4 12v8c0 10 7 18 16 20 9-2 16-10 16-20v-8L20 4zm0 4l12 6v6c0 8-5.3 14.4-12 16.4C13.3 34.4 8 28 8 20v-6l12-6z"/>
                  <path d="M14 18h12v2H14zm0 4h12v2H14zm3-8h6v2h-6z"/>
                </svg>
              )}
            </div>
          )}

          {/* School name + tagline */}
          {cfg.showSchoolName && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 15, fontWeight: 800, color: cfg.primaryColor,
                letterSpacing: 0.5, textTransform: "uppercase",
                lineHeight: 1.2, wordBreak: "break-word",
              }}>
                {schoolName}
              </div>
              {cfg.showTagline && cfg.tagline && (
                <div style={{
                  fontSize: 9.5, color: cfg.textColor, opacity: 0.6,
                  marginTop: 3, letterSpacing: 0.3,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span>——</span>
                  <span>{cfg.tagline}</span>
                  <span>——</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── STUDENT INFO — white section ──────────────── */}
        <div style={{
          backgroundColor: cfg.bgColor,
          padding: "16px 20px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}>
          {/* Photo circle */}
          {cfg.showPhoto && (
            <div style={{
              width: 72, height: 72, flexShrink: 0,
              borderRadius: "50%",
              border: `3px solid ${cfg.primaryColor}`,
              overflow: "hidden",
              backgroundColor: `${cfg.primaryColor}15`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {cfg.studentPhotoUrl ? (
                <img src={cfg.studentPhotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg viewBox="0 0 40 40" width={40} height={40}>
                  <circle cx="20" cy="14" r="8" fill={cfg.primaryColor} opacity={0.4} />
                  <path d="M4 36c0-8.8 7.2-16 16-16s16 7.2 16 16" fill={cfg.primaryColor} opacity={0.3} />
                </svg>
              )}
            </div>
          )}

          {/* Name + class + ID */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 18, fontWeight: 800, color: cfg.textColor,
              lineHeight: 1.2, marginBottom: 4, wordBreak: "break-word",
            }}>
              {student.full_name}
            </div>
            {cfg.showClassName && student.class_name && (
              <div style={{ fontSize: 13, fontWeight: 600, color: cfg.primaryColor, marginBottom: 3 }}>
                {student.class_name}
              </div>
            )}
            {cfg.showStudentId && student.employee_id && (
              <div style={{ fontSize: 11, color: cfg.textColor, opacity: 0.55 }}>
                Student ID: {student.employee_id}
              </div>
            )}
            {/* Divider line */}
            <div style={{
              height: 2, backgroundColor: cfg.primaryColor,
              borderRadius: 2, marginTop: 8, width: 40,
            }} />
          </div>
        </div>

        {/* ── QR SECTION — colored background ──────────── */}
        <div style={{
          flex: 1,
          backgroundColor: cfg.primaryColor,
          padding: "20px 20px 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decorative dot patterns */}
          <div style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            display: "grid", gridTemplateColumns: "repeat(3, 6px)", gap: 4,
            opacity: 0.2,
          }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "white" }} />
            ))}
          </div>
          <div style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            display: "grid", gridTemplateColumns: "repeat(3, 6px)", gap: 4,
            opacity: 0.2,
          }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "white" }} />
            ))}
          </div>

          {/* QR code */}
          <div style={{
            backgroundColor: cfg.qrBgColor,
            borderRadius: 14,
            padding: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          }}>
            <QRCodeCanvas
              value={student.qr_code}
              size={cfg.qrSize}
              bgColor={cfg.qrBgColor}
              fgColor={cfg.qrFgColor}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* Scan label */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            backgroundColor: "rgba(255,255,255,0.12)",
            borderRadius: 30, padding: "7px 18px",
            marginTop: 14,
          }}>
            {/* WiFi/scan icon */}
            <svg viewBox="0 0 24 24" width={16} height={16} fill="white" opacity={0.9}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8L2 12c0-5.52 4.48-10 10-10 2.76 0 5.26 1.12 7.07 2.93L17.65 6.35z"/>
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "white", letterSpacing: 0.3 }}>
              {cfg.scanLabel}
            </span>
          </div>
        </div>

        {/* ── FOOTER MOTTO ──────────────────────────────── */}
        {cfg.showFooterMotto && cfg.footerMotto && (
          <div style={{
            backgroundColor: cfg.primaryColor,
            borderTop: "1px solid rgba(255,255,255,0.15)",
            padding: "10px 16px",
            textAlign: "center",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <div style={{ height: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
              <span style={{
                fontSize: 8.5, fontWeight: 700, letterSpacing: 2,
                color: "rgba(255,255,255,0.85)", textTransform: "uppercase",
              }}>
                {cfg.footerMotto}
              </span>
              <div style={{ height: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export default function QRCardClient({
  student, schoolName, schoolSlug, studentId,
}: {
  student: Student;
  schoolName: string;
  schoolSlug: string;
  studentId: string;
}) {
  const [cfg, setCfg] = useState<CardConfig>(() => loadConfig(schoolSlug));
  const [logoPreview, setLogoPreview] = useState("");
  const [photoPreview, setPhotoPreview] = useState(student.photo_url || "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "done">("idle");
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "done" | "copied">("idle");
  const cardRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Sync photo preview from student data
  useEffect(() => {
    if (student.photo_url) setPhotoPreview(student.photo_url);
  }, [student.photo_url]);

  useEffect(() => {
    saveConfig(schoolSlug, cfg);
  }, [cfg, schoolSlug]);

  function update(patch: Partial<CardConfig>) {
    setCfg((c) => ({ ...c, ...patch }));
  }

  function applyPreset(name: string) {
    const p = PRESETS[name];
    if (p) setCfg((c) => ({ ...c, ...p }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setLogoPreview(url);
      update({ logoUrl: url });
    };
    reader.readAsDataURL(file);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPhotoPreview(url);
      update({ studentPhotoUrl: url });
    };
    reader.readAsDataURL(file);
  }

  // ── Render card to canvas for download ───────────────
  async function renderToCanvas(): Promise<HTMLCanvasElement | null> {
    const cardEl = cardRef.current?.querySelector("[data-card]") as HTMLElement | null
      || cardRef.current?.firstElementChild as HTMLElement | null;
    if (!cardEl) return null;

    const scale = 3;
    const w = cfg.cardWidth * scale;
    const h = (cardEl.offsetHeight || cfg.cardHeight) * scale;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = cfg.bgColor;
    roundRect(ctx, 0, 0, cfg.cardWidth, cardEl.offsetHeight, cfg.borderRadius);
    ctx.fill();

    // Header bg
    const headerEl = cardEl.querySelector("[data-header]") as HTMLElement | null;
    if (headerEl) {
      ctx.fillStyle = cfg.bgColor;
      ctx.fillRect(0, 0, cfg.cardWidth, headerEl.offsetHeight);
    }

    // QR canvas
    const qrCanvas = cardEl.querySelector("canvas") as HTMLCanvasElement | null;
    if (qrCanvas) {
      const qrParent = qrCanvas.parentElement;
      if (qrParent) {
        const rect = qrParent.getBoundingClientRect();
        const cardRect = cardEl.getBoundingClientRect();
        const qrBg = qrParent.parentElement;
        const bgRect = qrBg?.getBoundingClientRect();
        if (bgRect) {
          ctx.fillStyle = cfg.primaryColor;
          ctx.fillRect(0, bgRect.top - cardRect.top, cfg.cardWidth, bgRect.height);
        }
        ctx.fillStyle = cfg.qrBgColor;
        const qx = rect.left - cardRect.left;
        const qy = rect.top - cardRect.top;
        roundRect(ctx, qx, qy, rect.width, rect.height, 14);
        ctx.fill();
        ctx.drawImage(qrCanvas, qx + 12, qy + 12, cfg.qrSize, cfg.qrSize);
      }
    }

    // Text elements
    const textEls = cardEl.querySelectorAll("[data-text]");
    textEls.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const cardRect = cardEl.getBoundingClientRect();
      const style = window.getComputedStyle(htmlEl);
      ctx.fillStyle = style.color;
      ctx.font = `${style.fontWeight} ${style.fontSize} ${cfg.fontFamily}`;
      ctx.fillText(
        htmlEl.textContent || "",
        rect.left - cardRect.left,
        rect.top - cardRect.top + rect.height * 0.75
      );
    });

    return canvas;
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  async function handleDownload() {
    setSaveStatus("saving");
    try {
      // Use html2canvas approach via DOM serialization
      // Since html2canvas isn't available, we use the QR canvas directly
      // and build a proper canvas representation
      const qrCanvas = cardRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
      if (!qrCanvas) { setSaveStatus("idle"); return; }

      const scale = 3;
      const cardEl = cardRef.current?.firstElementChild as HTMLElement | null;
      const cardH = cardEl?.offsetHeight || cfg.cardHeight;
      const w = cfg.cardWidth * scale;
      const h = cardH * scale;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);

      // — Draw full card —
      // White background with rounded corners
      ctx.fillStyle = cfg.bgColor;
      ctx.beginPath();
      const r = cfg.borderRadius;
      ctx.moveTo(r, 0); ctx.lineTo(cfg.cardWidth - r, 0);
      ctx.quadraticCurveTo(cfg.cardWidth, 0, cfg.cardWidth, r);
      ctx.lineTo(cfg.cardWidth, cardH - r);
      ctx.quadraticCurveTo(cfg.cardWidth, cardH, cfg.cardWidth - r, cardH);
      ctx.lineTo(r, cardH); ctx.quadraticCurveTo(0, cardH, 0, cardH - r);
      ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.clip();

      // Header white area (~180px)
      const headerH = 180;
      ctx.fillStyle = cfg.bgColor;
      ctx.fillRect(0, 0, cfg.cardWidth, headerH);

      // Bottom colored area
      ctx.fillStyle = cfg.primaryColor;
      ctx.fillRect(0, headerH, cfg.cardWidth, cardH - headerH);

      // Logo placeholder box
      if (cfg.showLogo && !cfg.logoUrl) {
        ctx.fillStyle = cfg.primaryColor + "22";
        ctx.beginPath();
        ctx.roundRect(20, 24, 52, 52, 8);
        ctx.fill();
        ctx.strokeStyle = cfg.primaryColor + "40";
        ctx.lineWidth = 2;
        ctx.stroke();
        // School icon
        ctx.fillStyle = cfg.primaryColor;
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🏫", 46, 55);
        ctx.textAlign = "left";
      }

      // Draw logo if provided
      if (cfg.showLogo && cfg.logoUrl) {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        await new Promise<void>((res) => {
          logoImg.onload = () => {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(20, 24, 52, 52, 8);
            ctx.clip();
            ctx.drawImage(logoImg, 20, 24, 52, 52);
            ctx.restore();
            res();
          };
          logoImg.onerror = () => res();
          logoImg.src = cfg.logoUrl;
        });
      }

      // School name
      if (cfg.showSchoolName) {
        ctx.fillStyle = cfg.primaryColor;
        ctx.font = `800 15px ${cfg.fontFamily}`;
        ctx.fillText(schoolName.toUpperCase(), 84, 48);
      }

      // Tagline
      if (cfg.showTagline && cfg.tagline) {
        ctx.fillStyle = cfg.textColor;
        ctx.globalAlpha = 0.55;
        ctx.font = `400 9px ${cfg.fontFamily}`;
        ctx.fillText(`—— ${cfg.tagline} ——`, 84, 64);
        ctx.globalAlpha = 1;
      }

      // Divider
      ctx.fillStyle = cfg.primaryColor + "25";
      ctx.fillRect(0, 88, cfg.cardWidth, 2);

      // Student photo circle placeholder
      const photoX = 20, photoY = 100, photoR = 36;
      ctx.save();
      ctx.beginPath();
      ctx.arc(photoX + photoR, photoY + photoR, photoR, 0, Math.PI * 2);
      ctx.clip();
      if (cfg.studentPhotoUrl || cfg.showPhoto) {
        ctx.fillStyle = cfg.primaryColor + "22";
        ctx.fill();
        if (cfg.studentPhotoUrl) {
          const pImg = new Image();
          pImg.crossOrigin = "anonymous";
          await new Promise<void>((res) => {
            pImg.onload = () => {
              ctx.drawImage(pImg, photoX, photoY, photoR * 2, photoR * 2);
              res();
            };
            pImg.onerror = () => res();
            pImg.src = cfg.studentPhotoUrl;
          });
        }
      }
      ctx.restore();
      // Circle border
      ctx.strokeStyle = cfg.primaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(photoX + photoR, photoY + photoR, photoR, 0, Math.PI * 2);
      ctx.stroke();

      // Student name
      ctx.fillStyle = cfg.textColor;
      ctx.font = `800 18px ${cfg.fontFamily}`;
      ctx.fillText(student.full_name, 76, 122);

      // Class
      if (cfg.showClassName && student.class_name) {
        ctx.fillStyle = cfg.primaryColor;
        ctx.font = `600 13px ${cfg.fontFamily}`;
        ctx.fillText(student.class_name, 76, 142);
      }

      // Student ID
      if (cfg.showStudentId && student.employee_id) {
        ctx.fillStyle = cfg.textColor;
        ctx.globalAlpha = 0.55;
        ctx.font = `400 11px ${cfg.fontFamily}`;
        ctx.fillText(`Student ID: ${student.employee_id}`, 76, 158);
        ctx.globalAlpha = 1;
      }

      // Underline accent
      ctx.fillStyle = cfg.primaryColor;
      ctx.fillRect(76, 168, 40, 2);

      // Dot patterns on sides
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.beginPath();
          ctx.arc(10 + c * 10, headerH + 60 + r * 10, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cfg.cardWidth - 20 + c * 10 - 20, headerH + 60 + r * 10, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // QR code white container
      const qrContainerX = (cfg.cardWidth - cfg.qrSize - 24) / 2;
      const qrContainerY = headerH + 16;
      ctx.fillStyle = cfg.qrBgColor;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(qrContainerX, qrContainerY, cfg.qrSize + 24, cfg.qrSize + 24, 14);
      ctx.fill();
      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.2)";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Draw QR from existing canvas
      ctx.drawImage(qrCanvas, qrContainerX + 12, qrContainerY + 12, cfg.qrSize, cfg.qrSize);

      // Scan label pill
      const pillY = qrContainerY + cfg.qrSize + 24 + 10;
      const pillW = 160, pillH = 28;
      const pillX = (cfg.cardWidth - pillW) / 2;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 14);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = `600 11px ${cfg.fontFamily}`;
      ctx.textAlign = "center";
      ctx.fillText(cfg.scanLabel, cfg.cardWidth / 2, pillY + 19);
      ctx.textAlign = "left";

      // Footer motto
      if (cfg.showFooterMotto && cfg.footerMotto) {
        const footerY = cardH - 32;
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(0, footerY, cfg.cardWidth, 32);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = `700 7.5px ${cfg.fontFamily}`;
        ctx.textAlign = "center";
        ctx.letterSpacing = "2px";
        ctx.fillText(cfg.footerMotto, cfg.cardWidth / 2, footerY + 20);
        ctx.textAlign = "left";
      }

      // Lanyard hole
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.ellipse(cfg.cardWidth / 2, 10, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Download
      const url = canvas.toDataURL("image/png", 1);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${student.full_name.replace(/\s+/g, "-")}-QR-card.png`;
      a.click();
      setSaveStatus("done");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err) {
      console.error("Download error:", err);
      setSaveStatus("idle");
    }
  }

  async function handleShare() {
    setShareStatus("sharing");
    try {
      await handleDownload();
      setShareStatus("done");
      setTimeout(() => setShareStatus("idle"), 2000);
    } catch {
      setShareStatus("idle");
    }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
      <style>{`
        @page {
          size: A4;
          margin: 10mm;
        }
        .qr-designer-panel { background: #0a100d; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; position: sticky; top: 80px; max-height: calc(100vh - 100px); overflow-y: auto; }
        .qr-designer-panel::-webkit-scrollbar { width: 3px; }
        .qr-designer-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @media (max-width: 768px) { .qr-designer-grid { grid-template-columns: 1fr !important; } }
        @media print {
          body * { visibility: hidden !important; }
          #qr-print-target, #qr-print-target * { visibility: visible !important; }
          #qr-print-target { position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%,-50%) !important; z-index: 9999 !important; }
        }
      `}</style>

      {/* ── Controls ── */}
      <div className="qr-designer-panel">
        {/* Preset bar */}
        <div className="px-4 py-3 border-b border-white/8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Quick Themes</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PRESETS).map(([name, preset]) => (
              <button
                key={name}
                onClick={() => applyPreset(name)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wide border border-white/10 hover:border-white/30 text-slate-400 hover:text-white transition-all"
                style={{ backgroundColor: (preset as any).primaryColor + "20" }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Images */}
        <Section title="Photos" icon={<ImageIcon size={12} />}>
          <div>
            <p className="text-[10px] text-slate-500 mb-1.5">School Logo</p>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button
              onClick={() => logoInputRef.current?.click()}
              className="w-full py-2 rounded-lg border border-white/10 text-xs text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              {cfg.logoUrl ? "✓ Logo uploaded · click to change" : "Upload school logo"}
            </button>
            {cfg.logoUrl && (
              <button onClick={() => update({ logoUrl: "" })} className="text-[10px] text-red-400 mt-1 hover:underline w-full text-center">
                Remove logo
              </button>
            )}
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-1.5">Student Photo</p>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            <button
              onClick={() => photoInputRef.current?.click()}
              className="w-full py-2 rounded-lg border border-white/10 text-xs text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              {photoPreview ? "✓ Photo uploaded · click to change" : "Upload student photo"}
            </button>
          </div>
        </Section>

        {/* Colors */}
        <Section title="Colors" icon={<Palette size={12} />} open={false}>
          <ColorRow label="Primary" value={cfg.primaryColor} onChange={(v) => update({ primaryColor: v })} />
          <ColorRow label="Card background" value={cfg.bgColor} onChange={(v) => update({ bgColor: v })} />
          <ColorRow label="Text" value={cfg.textColor} onChange={(v) => update({ textColor: v })} />
          <ColorRow label="QR foreground" value={cfg.qrFgColor} onChange={(v) => update({ qrFgColor: v })} />
          <ColorRow label="QR background" value={cfg.qrBgColor} onChange={(v) => update({ qrBgColor: v })} />
        </Section>

        {/* Text */}
        <Section title="Text" icon={<Type size={12} />} open={false}>
          <div>
            <p className="text-[10px] text-slate-500 mb-1">Tagline (under school name)</p>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600"
              placeholder="Integrity & Excellence"
              value={cfg.tagline}
              onChange={(e) => update({ tagline: e.target.value })}
            />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-1">Scan label</p>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600"
              placeholder="Scan for Attendance"
              value={cfg.scanLabel}
              onChange={(e) => update({ scanLabel: e.target.value })}
            />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-1">Footer motto</p>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600"
              placeholder="INTEGRITY • DISCIPLINE • EXCELLENCE"
              value={cfg.footerMotto}
              onChange={(e) => update({ footerMotto: e.target.value })}
            />
          </div>
        </Section>

        {/* Size */}
        <Section title="Size" icon={<Layout size={12} />} open={false}>
          {[
            { label: "Card width", key: "cardWidth", min: 240, max: 400 },
            { label: "QR size", key: "qrSize", min: 120, max: 240 },
            { label: "Corner radius", key: "borderRadius", min: 0, max: 40 },
          ].map(({ label, key, min, max }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-slate-400">{label}</span>
                <span className="text-[10px] font-mono text-green-400">{(cfg as any)[key]}</span>
              </div>
              <input
                type="range" min={min} max={max}
                value={(cfg as any)[key]}
                onChange={(e) => update({ [key]: Number(e.target.value) } as any)}
                className="w-full accent-green-600 h-1"
              />
            </div>
          ))}
        </Section>

        {/* Visibility toggles */}
        <Section title="Show / Hide" icon={<Eye size={12} />} open={false}>
          {[
            { key: "showLogo", label: "School logo" },
            { key: "showSchoolName", label: "School name" },
            { key: "showTagline", label: "Tagline" },
            { key: "showPhoto", label: "Student photo" },
            { key: "showClassName", label: "Class name" },
            { key: "showStudentId", label: "Student ID" },
            { key: "showFooterMotto", label: "Footer motto" },
          ].map(({ key, label }) => (
            <Toggle
              key={key}
              label={label}
              value={(cfg as any)[key]}
              onChange={(v) => update({ [key]: v } as any)}
            />
          ))}
        </Section>

        {/* Reset */}
        <div className="p-4">
          <button
            onClick={() => { setCfg(DEFAULT_CONFIG); setLogoPreview(""); setPhotoPreview(""); }}
            className="w-full py-2 rounded-lg border border-white/10 text-xs text-slate-500 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={12} /> Reset to default
          </button>
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-slate-500 flex-1">
            Preview · {cfg.cardWidth}px wide · auto-saved
          </span>
          <button
            onClick={handleDownload}
            disabled={saveStatus === "saving"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#bbf7d0] dark:border-[#1a3a24] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
          >
            {saveStatus === "saving" ? <Loader2 size={14} className="animate-spin" /> :
             saveStatus === "done" ? <Check size={14} className="text-green-500" /> : <Download size={14} />}
            {saveStatus === "saving" ? "Saving…" : saveStatus === "done" ? "Saved!" : "Download PNG"}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
          >
            <Printer size={14} /> Print
          </button>
        </div>

        {/* Card */}
        <div
          className="flex items-center justify-center p-8 rounded-2xl border border-[#bbf7d0] dark:border-[#1a3a24]"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(34,197,94,0.04) 0%, transparent 70%), #f8fafc" }}
        >
          <div id="qr-print-target" ref={cardRef}>
            <CardPreview cfg={cfg} student={{ ...student, photo_url: photoPreview }} schoolName={schoolName} cardRef={cardRef} />
          </div>
        </div>

        {/* Info box */}
        <div className="p-4 rounded-xl border border-[#bbf7d0] dark:border-[#1a3a24] bg-green-50/50 dark:bg-green-950/10 text-xs text-slate-500 dark:text-[#6b9e7a] space-y-1.5">
          <p><strong className="text-green-700 dark:text-green-400">Design auto-saved</strong> — your card style is remembered in this browser even after you refresh.</p>
          <p><strong className="text-green-700 dark:text-green-400">Print</strong> — sends to printer. Best on cardstock (250gsm) or glossy photo paper.</p>
          <p><strong className="text-green-700 dark:text-green-400">Download PNG</strong> — high-res 3× image. Perfect for printing at any shop or sending to parents via WhatsApp.</p>
          <p><strong className="text-green-700 dark:text-green-400">Student photo</strong> — upload a passport photo for a professional ID card look like the example above.</p>
        </div>
      </div>
    </div>
  );
}