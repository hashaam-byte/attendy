"use client";
import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QRCodeCanvas } from "qrcode.react";
import Link from "next/link";
import {
  ArrowLeft, Printer, Download, Loader2,
  Users, BookOpen, CheckCircle,
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
};

export default function BulkQRPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug }  = use(params);
  const router    = useRouter();
  const supabase  = createClient();
  const printRef  = useRef<HTMLDivElement>(null);

  const [students,     setStudents]     = useState<Student[]>([]);
  const [classes,      setClasses]      = useState<string[]>([]);
  const [selectedClass,setSelectedClass]= useState<string>("all");
  const [org,          setOrg]          = useState<OrgInfo | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [printing,     setPrinting]     = useState(false);

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
          .select("name, primary_color, logo_url")
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
      setLoading(false);
    })();
  }, [slug]);

  const filtered = selectedClass === "all"
    ? students
    : students.filter((s) => s.class_name === selectedClass);

  const primaryColor = org?.primary_color ?? "#16a34a";

  function handlePrint() {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <>
      {/* ── Print-only styles ── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #bulk-print-area { display: block !important; }
          #bulk-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
        @media screen {
          #bulk-print-area .qr-card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
          }
        }
        @media print {
          #bulk-print-area .qr-card-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            padding: 12px;
          }
          #bulk-print-area .qr-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* ── Screen UI ── */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
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

          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 text-xs text-green-700 dark:text-green-300 space-y-1">
            <p className="font-semibold">Printing tips:</p>
            <p>• Best on A4 paper — 3 cards per row, ~6 per page</p>
            <p>• Use cardstock (200gsm+) or laminate after printing for durability</p>
            <p>• In the print dialog, set margins to "None" or "Minimum"</p>
            <p>• Each card has the student's unique QR code — do not photocopy</p>
          </div>
        </div>

        {/* Preview grid */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Preview — {filtered.length} card{filtered.length !== 1 ? "s" : ""}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.slice(0, 12).map((student) => (
              <MiniCard
                key={student.id}
                student={student}
                schoolName={org?.name ?? "School"}
                primaryColor={primaryColor}
              />
            ))}
            {filtered.length > 12 && (
              <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-[#bbf7d0] dark:border-[#1a3a24] p-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    +{filtered.length - 12}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-[#4a7a5a] mt-1">more cards</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Hidden print area ── */}
      <div id="bulk-print-area" style={{ display: "none" }} ref={printRef}>
        <div className="qr-card-grid">
          {filtered.map((student) => (
            <PrintCard
              key={student.id}
              student={student}
              schoolName={org?.name ?? "School"}
              primaryColor={primaryColor}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ── Mini preview card (screen) ─────────────────────────────────
function MiniCard({
  student,
  schoolName,
  primaryColor,
}: {
  student:      Student;
  schoolName:   string;
  primaryColor: string;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden border border-[#bbf7d0] dark:border-[#1a3a24]"
      style={{ background: "white" }}
    >
      {/* Header */}
      <div
        className="px-2 py-1.5 text-center"
        style={{ backgroundColor: primaryColor }}
      >
        <p className="text-white text-[9px] font-bold uppercase tracking-wide truncate">
          {schoolName}
        </p>
      </div>
      {/* QR */}
      <div className="flex justify-center py-2 px-2">
        <QRCodeCanvas
          value={student.qr_code}
          size={80}
          bgColor="#ffffff"
          fgColor="#0f172a"
          level="H"
          includeMargin={false}
        />
      </div>
      {/* Info */}
      <div className="px-2 pb-2 text-center">
        <p className="text-[10px] font-bold text-slate-900 leading-tight truncate">
          {student.full_name}
        </p>
        {student.class_name && (
          <p className="text-[9px] text-slate-500 mt-0.5">{student.class_name}</p>
        )}
      </div>
    </div>
  );
}

// ── Full print card (print-only) ───────────────────────────────
function PrintCard({
  student,
  schoolName,
  primaryColor,
}: {
  student:      Student;
  schoolName:   string;
  primaryColor: string;
}) {
  return (
    <div
      className="qr-card"
      style={{
        background:    "white",
        borderRadius:  12,
        overflow:      "hidden",
        border:        "1px solid #e2e8f0",
        fontFamily:    "sans-serif",
      }}
    >
      {/* Header bar */}
      <div style={{ backgroundColor: primaryColor, padding: "8px 12px", textAlign: "center" }}>
        <p style={{ color: "white", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
          {schoolName}
        </p>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 8, margin: "2px 0 0", letterSpacing: "0.1em" }}>
          STUDENT ID CARD
        </p>
      </div>

      {/* QR code */}
      <div style={{ display: "flex", justifyContent: "center", padding: "14px 12px 8px" }}>
        <div style={{ padding: 8, background: "white", borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <QRCodeCanvas
            value={student.qr_code}
            size={120}
            bgColor="#ffffff"
            fgColor="#0f172a"
            level="H"
            includeMargin={false}
          />
        </div>
      </div>

      {/* Student info */}
      <div style={{ padding: "0 12px 14px", textAlign: "center" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 3px", lineHeight: 1.2 }}>
          {student.full_name}
        </p>
        {student.class_name && (
          <p style={{ fontSize: 11, color: primaryColor, fontWeight: 600, margin: "0 0 3px" }}>
            {student.class_name}
          </p>
        )}
        {student.employee_id && (
          <p style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace", margin: 0 }}>
            {student.employee_id}
          </p>
        )}
        {/* Scan label */}
        <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, background: `${primaryColor}15`, borderRadius: 20, padding: "3px 10px" }}>
          <p style={{ fontSize: 9, color: primaryColor, fontWeight: 600, margin: 0, letterSpacing: "0.05em" }}>
            SCAN FOR ATTENDANCE
          </p>
        </div>
      </div>
    </div>
  );
}