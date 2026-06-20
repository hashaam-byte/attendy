"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QRCodeCanvas } from "qrcode.react";
import Link from "next/link";
import {
  ArrowLeft, Printer, Loader2, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Student = {
  id:          string;
  full_name:   string;
  class_name:  string | null;
  qr_code:     string;
  employee_id: string | null;
};

type OrgInfo = {
  name:          string;
  primary_color: string;
  logo_url:      string | null;
  settings?:     any;
};

// ── Matches the CardPreview in qr-cards-client exactly ──────────
function FullCard({
  student,
  schoolName,
  primaryColor,
  logoUrl,
  tagline,
  footerMotto,
  scanLabel,
  cardWidth,
  qrSize,
  borderRadius,
  showLogo,
  showPhoto,
  showSchoolName,
  showTagline,
  showClassName,
  showStudentId,
  showFooterMotto,
  fontFamily,
}: {
  student:          Student;
  schoolName:       string;
  primaryColor:     string;
  logoUrl:          string | null;
  tagline:          string;
  footerMotto:      string;
  scanLabel:        string;
  cardWidth:        number;
  qrSize:           number;
  borderRadius:     number;
  showLogo:         boolean;
  showPhoto:        boolean;
  showSchoolName:   boolean;
  showTagline:      boolean;
  showClassName:    boolean;
  showStudentId:    boolean;
  showFooterMotto:  boolean;
  fontFamily:       string;
}) {
  return (
    <div style={{ width: cardWidth, fontFamily }}>
      <div
        style={{
          width: cardWidth,
          backgroundColor: "#ffffff",
          borderRadius,
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Lanyard hole */}
        <div style={{
          position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
          width: 28, height: 10, backgroundColor: "#e2e8f0",
          borderRadius: 5, zIndex: 10,
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
        }} />

        {/* Header — white section */}
        <div style={{
          backgroundColor: "#ffffff",
          padding: "24px 20px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          borderBottom: `2px solid ${primaryColor}20`,
        }}>
          {showLogo && (
            <div style={{
              width: 52, height: 52, flexShrink: 0,
              borderRadius: 8, overflow: "hidden",
              backgroundColor: logoUrl ? "transparent" : `${primaryColor}15`,
              border: `2px solid ${primaryColor}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {logoUrl ? (
                <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
              ) : (
                <svg viewBox="0 0 40 40" width={32} height={32} fill={primaryColor} opacity={0.8}>
                  <path d="M20 4L4 12v8c0 10 7 18 16 20 9-2 16-10 16-20v-8L20 4zm0 4l12 6v6c0 8-5.3 14.4-12 16.4C13.3 34.4 8 28 8 20v-6l12-6z"/>
                  <path d="M14 18h12v2H14zm0 4h12v2H14zm3-8h6v2h-6z"/>
                </svg>
              )}
            </div>
          )}

          {showSchoolName && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 15, fontWeight: 800, color: primaryColor,
                letterSpacing: 0.5, textTransform: "uppercase",
                lineHeight: 1.2, wordBreak: "break-word",
              }}>
                {schoolName}
              </div>
              {showTagline && tagline && (
                <div style={{
                  fontSize: 9.5, color: "#0f172a", opacity: 0.6,
                  marginTop: 3, letterSpacing: 0.3,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span>——</span>
                  <span>{tagline}</span>
                  <span>——</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Student info — white section */}
        <div style={{
          backgroundColor: "#ffffff",
          padding: "16px 20px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}>
          {showPhoto && (
            <div style={{
              width: 72, height: 72, flexShrink: 0,
              borderRadius: "50%",
              border: `3px solid ${primaryColor}`,
              overflow: "hidden",
              backgroundColor: `${primaryColor}15`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 40 40" width={40} height={40}>
                <circle cx="20" cy="14" r="8" fill={primaryColor} opacity={0.4} />
                <path d="M4 36c0-8.8 7.2-16 16-16s16 7.2 16 16" fill={primaryColor} opacity={0.3} />
              </svg>
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 18, fontWeight: 800, color: "#0f172a",
              lineHeight: 1.2, marginBottom: 4, wordBreak: "break-word",
            }}>
              {student.full_name}
            </div>
            {showClassName && student.class_name && (
              <div style={{ fontSize: 13, fontWeight: 600, color: primaryColor, marginBottom: 3 }}>
                {student.class_name}
              </div>
            )}
            {showStudentId && student.employee_id && (
              <div style={{ fontSize: 11, color: "#0f172a", opacity: 0.55 }}>
                Student ID: {student.employee_id}
              </div>
            )}
            <div style={{
              height: 2, backgroundColor: primaryColor,
              borderRadius: 2, marginTop: 8, width: 40,
            }} />
          </div>
        </div>

        {/* QR section — colored background */}
        <div style={{
          flex: 1,
          backgroundColor: primaryColor,
          padding: "20px 20px 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}>
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

          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: 14,
            padding: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          }}>
            <QRCodeCanvas
              value={student.qr_code}
              size={qrSize}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="H"
              includeMargin={false}
            />
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            backgroundColor: "rgba(255,255,255,0.12)",
            borderRadius: 30, padding: "7px 18px",
            marginTop: 14,
          }}>
            <svg viewBox="0 0 24 24" width={16} height={16} fill="white" opacity={0.9}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8L2 12c0-5.52 4.48-10 10-10 2.76 0 5.26 1.12 7.07 2.93L17.65 6.35z"/>
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "white", letterSpacing: 0.3 }}>
              {scanLabel}
            </span>
          </div>
        </div>

        {/* Footer motto */}
        {showFooterMotto && footerMotto && (
          <div style={{
            backgroundColor: primaryColor,
            borderTop: "1px solid rgba(255,255,255,0.15)",
            padding: "10px 16px",
            textAlign: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ height: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
              <span style={{
                fontSize: 8.5, fontWeight: 700, letterSpacing: 2,
                color: "rgba(255,255,255,0.85)", textTransform: "uppercase",
              }}>
                {footerMotto}
              </span>
              <div style={{ height: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Default card config (mirrors qr-cards-client DEFAULT_CONFIG) ─
const DEFAULT = {
  tagline:         "Integrity & Excellence",
  footerMotto:     "INTEGRITY  •  DISCIPLINE  •  EXCELLENCE",
  scanLabel:       "Scan for Attendance",
  cardWidth:       320,
  qrSize:          160,
  borderRadius:    20,
  showLogo:        true,
  showPhoto:       true,
  showSchoolName:  true,
  showTagline:     true,
  showClassName:   true,
  showStudentId:   true,
  showFooterMotto: true,
  fontFamily:      "'Segoe UI', system-ui, sans-serif",
};

function loadCardConfig(slug: string) {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(`attendy_card_v3_${slug}`);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { return DEFAULT; }
}

export default function BulkQRPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug }  = use(params);
  const router    = useRouter();
  const supabase  = createClient();

  const [students,      setStudents]      = useState<Student[]>([]);
  const [classes,       setClasses]       = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [org,           setOrg]           = useState<OrgInfo | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [printing,      setPrinting]      = useState(false);
  const [cfg,           setCfg]           = useState(DEFAULT);
  const [cardsPerPage,  setCardsPerPage]  = useState<2 | 4 | 6 | 8>(6);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${slug}/login`); return; }

      const { data: orgUser } = await supabase
        .from("org_users")
        .select("organisation_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      if (!orgUser) { router.push(`/${slug}/login`); return; }

      const [{ data: orgData }, { data: studentData }] = await Promise.all([
        supabase
          .from("organisations")
          .select("name, primary_color, logo_url, settings")
          .eq("id", orgUser.organisation_id)
          .single(),
        supabase
          .from("members")
          .select("id, full_name, class_name, qr_code, employee_id")
          .eq("organisation_id", orgUser.organisation_id)
          .eq("member_type", "student")
          .eq("is_active", true)
          .order("class_name")
          .order("full_name"),
      ]);

      if (orgData) setOrg(orgData as OrgInfo);

      const allStudents = (studentData ?? []) as Student[];
      setStudents(allStudents);

      const uniqueClasses = [
        ...new Set(allStudents.map((s) => s.class_name).filter(Boolean) as string[]),
      ].sort();
      setClasses(uniqueClasses);

      setCfg(loadCardConfig(slug));
      setLoading(false);
    })();
  }, [slug]);

  const filtered = selectedClass === "all"
    ? students
    : students.filter((s) => s.class_name === selectedClass);

  const primaryColor = org?.primary_color ?? "#16a34a";
  const logoUrl      = org?.logo_url ?? null;

  function handlePrint() {
    setPrinting(true);
    // Small delay lets React finish rendering the (already-mounted but
    // visibility:hidden) print area before the browser snapshots it.
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 150);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  // Grid columns based on cards-per-page choice
  const gridCols = cardsPerPage <= 2 ? 1 : cardsPerPage <= 4 ? 2 : 3;

  return (
    <>
      {/* ── Print styles ──────────────────────────────────────
          FIX: use `visibility` not `display` to avoid the
          nested-ancestor display:none problem. Position the
          print area absolutely so it fills the printed page
          regardless of where it sits in the DOM. */}
      <style>{`
        @page {
          size: A4;
          margin: 10mm;
        }
        @media print {
          html, body { visibility: hidden !important; margin: 0; padding: 0; background: white !important; }
          #bulk-print-area, #bulk-print-area * { visibility: visible !important; }
          #bulk-print-area {
            position: absolute !important;
            top: 0; left: 0;
            width: 100%;
            margin: 0; padding: 0;
            background: white !important;
          }
          #bulk-print-area .print-grid {
            display: grid;
            grid-template-columns: repeat(${gridCols}, 1fr);
            gap: 8mm;
            padding: 0;
          }
          #bulk-print-area .print-card {
            break-inside: avoid;
            page-break-inside: avoid;
            display: flex;
            justify-content: center;
          }
        }
        /* On screen, the print area is invisible but still rendered
           (so window.print() always has content) and takes no layout
           space. */
        @media screen {
          #bulk-print-area {
            position: absolute;
            top: -99999px;
            left: -99999px;
            visibility: hidden;
            pointer-events: none;
          }
        }
      `}</style>

      {/* Screen UI */}
      <div className="space-y-5 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/${slug}/qr-cards`} className="btn-ghost p-2">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex-1">
            <h2 className="page-title">Bulk QR Card Printing</h2>
            <p className="page-sub">Print QR cards for an entire class at once</p>
          </div>
        </div>

        {/* Controls */}
        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Select Class
              </label>
              <select
                className="input-base"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="all">All Students ({students.length})</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c} ({students.filter((s) => s.class_name === c).length} students)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Cards per A4 page
              </label>
              <select
                className="input-base"
                value={cardsPerPage}
                onChange={(e) => setCardsPerPage(Number(e.target.value) as 2 | 4 | 6 | 8)}
              >
                <option value={2}>2 (large, 1 column)</option>
                <option value={4}>4 (2 columns)</option>
                <option value={6}>6 (3 columns)</option>
                <option value={8}>8 (3 columns, compact)</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handlePrint}
                disabled={printing || filtered.length === 0}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
              >
                {printing
                  ? <><Loader2 size={15} className="animate-spin" /> Preparing…</>
                  : <><Printer size={15} /> Print {filtered.length} Card{filtered.length !== 1 ? "s" : ""}</>
                }
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg text-xs space-y-1" style={{ background: "var(--accent-bg)", border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
            <p className="font-semibold">Printing tips:</p>
            <p>• Print opens an A4-sized preview — choose your printer and confirm</p>
            <p>• Cards use the same design as the QR Card Designer — edit there to change logo, colours, motto</p>
            <p>• Use cardstock (200gsm+) or laminate after printing</p>
            <p>• In the print dialog, set margins to "Default" — A4 page size is already set for you</p>
            <p>• Each card has the student's unique QR code — do not photocopy</p>
          </div>
        </div>

        {/* Preview grid */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Preview — {filtered.length} card{filtered.length !== 1 ? "s" : ""}
            </h3>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: "var(--text-faint)" }}>
              No students in this selection.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {filtered.slice(0, 12).map((student) => {
                const previewWidth = 160;
                const scale = previewWidth / cfg.cardWidth;
                return (
                  <div
                    key={student.id}
                    style={{
                      width: previewWidth,
                      height: Math.round(cfg.cardWidth * 1.56 * scale),
                      overflow: "hidden",
                      borderRadius: Math.round(cfg.borderRadius * scale),
                      boxShadow: "var(--shadow-md)",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                      <FullCard
                        student={student}
                        schoolName={org?.name ?? "School"}
                        primaryColor={primaryColor}
                        logoUrl={logoUrl}
                        tagline={cfg.tagline}
                        footerMotto={cfg.footerMotto}
                        scanLabel={cfg.scanLabel}
                        cardWidth={cfg.cardWidth}
                        qrSize={cfg.qrSize}
                        borderRadius={cfg.borderRadius}
                        showLogo={cfg.showLogo}
                        showPhoto={cfg.showPhoto}
                        showSchoolName={cfg.showSchoolName}
                        showTagline={cfg.showTagline}
                        showClassName={cfg.showClassName}
                        showStudentId={cfg.showStudentId}
                        showFooterMotto={cfg.showFooterMotto}
                        fontFamily={cfg.fontFamily}
                      />
                    </div>
                  </div>
                );
              })}
              {filtered.length > 12 && (
                <div className="flex items-center justify-center rounded-xl border-2 border-dashed p-4 text-center" style={{ width: 160, borderColor: "var(--border-strong)" }}>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
                      +{filtered.length - 12}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>more cards</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Print area — ALWAYS rendered (just visually hidden on screen) so
          window.print() always has real content. */}
      <div id="bulk-print-area">
        <div className="print-grid">
          {filtered.map((student) => (
            <div key={student.id} className="print-card">
              <FullCard
                student={student}
                schoolName={org?.name ?? "School"}
                primaryColor={primaryColor}
                logoUrl={logoUrl}
                tagline={cfg.tagline}
                footerMotto={cfg.footerMotto}
                scanLabel={cfg.scanLabel}
                cardWidth={cfg.cardWidth}
                qrSize={cfg.qrSize}
                borderRadius={cfg.borderRadius}
                showLogo={cfg.showLogo}
                showPhoto={cfg.showPhoto}
                showSchoolName={cfg.showSchoolName}
                showTagline={cfg.showTagline}
                showClassName={cfg.showClassName}
                showStudentId={cfg.showStudentId}
                showFooterMotto={cfg.showFooterMotto}
                fontFamily={cfg.fontFamily}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
