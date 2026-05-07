"use client";
import { useState, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer, QrCode, Search, Grid3x3, List, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Student = {
  id: string; full_name: string; class_name: string | null;
  qr_code: string; employee_id: string | null; is_active: boolean;
};

export function QRCardsClient({
  students, schoolName, primaryColor,
}: {
  students: Student[]; schoolName: string; primaryColor: string;
}) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const classes = useMemo(() => {
    const s = new Set(students.map((s) => s.class_name).filter(Boolean) as string[]);
    return ["all", ...Array.from(s).sort()];
  }, [students]);

  const filtered = useMemo(() =>
    students.filter((s) => {
      const matchSearch = !search || s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.class_name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === "all" || s.class_name === classFilter;
      return matchSearch && matchClass;
    }),
    [students, search, classFilter]
  );

  async function downloadCard(student: Student) {
    const canvas = document.getElementById(`qr-${student.id}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const sc = 3;
    const W = 280 * sc, H = 360 * sc;
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = primaryColor; ctx.fillRect(0, 0, W, 72 * sc);
    ctx.fillStyle = "#ffffff"; ctx.textAlign = "center";
    ctx.font = `bold ${13 * sc}px sans-serif`;
    ctx.fillText(schoolName.toUpperCase().slice(0, 22), W / 2, 26 * sc);
    ctx.font = `${9 * sc}px sans-serif`;
    ctx.fillText("STUDENT ID CARD", W / 2, 44 * sc);
    ctx.drawImage(canvas, (W - 150 * sc) / 2, 82 * sc, 150 * sc, 150 * sc);
    ctx.fillStyle = "#0f172a"; ctx.font = `bold ${15 * sc}px sans-serif`;
    ctx.fillText(student.full_name.slice(0, 24), W / 2, 262 * sc);
    ctx.fillStyle = "#64748b"; ctx.font = `${11 * sc}px sans-serif`;
    ctx.fillText(student.class_name ?? "", W / 2, 280 * sc);
    if (student.employee_id) {
      ctx.fillStyle = "#94a3b8"; ctx.font = `${9 * sc}px monospace`;
      ctx.fillText(student.employee_id, W / 2, 298 * sc);
    }
    ctx.fillStyle = "#cbd5e1"; ctx.font = `${7 * sc}px monospace`;
    ctx.fillText(student.qr_code.slice(0, 16).toUpperCase(), W / 2, 320 * sc);
    const url = out.toDataURL("image/png", 1.0);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student.full_name.replace(/\s+/g, "-")}-QR.png`;
    a.click();
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link href="/students" className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div className="flex-1">
          <h2 className="page-title">QR Cards</h2>
          <p className="page-sub">{students.length} students · {filtered.length} showing</p>
        </div>
        <button onClick={() => window.print()} className="btn-secondary text-sm print:hidden">
          <Printer size={15} />Print All
        </button>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-base pl-9" placeholder="Search students…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-base w-auto" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          {classes.map((c) => <option key={c} value={c}>{c === "all" ? "All Classes" : c}</option>)}
        </select>
        <div className="flex border border-[#bbf7d0] dark:border-[#1a3a24] rounded-lg overflow-hidden">
          <button onClick={() => setView("grid")} className={cn("p-2 transition-colors", view === "grid" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" : "text-slate-400 hover:bg-green-50")}>
            <Grid3x3 size={15} />
          </button>
          <button onClick={() => setView("list")} className={cn("p-2 transition-colors", view === "list" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" : "text-slate-400 hover:bg-green-50")}>
            <List size={15} />
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 print:grid-cols-4">
          {filtered.map((student) => (
            <div key={student.id} className="card overflow-hidden print:break-inside-avoid print:border print:border-slate-200">
              <div className="px-3 py-2 text-center" style={{ background: primaryColor }}>
                <p className="text-white text-[9px] font-bold uppercase tracking-wide truncate">{schoolName}</p>
                <p className="text-white/60 text-[7px] uppercase tracking-wider">Student ID</p>
              </div>
              <div className="flex justify-center py-3 px-3">
                <QRCodeCanvas id={`qr-${student.id}`} value={student.qr_code}
                  size={100} bgColor="#ffffff" fgColor="#0f172a" level="H" includeMargin={false} />
              </div>
              <div className="px-2 pb-3 text-center">
                <p className="font-semibold text-slate-900 dark:text-white text-xs leading-tight truncate">{student.full_name}</p>
                {student.class_name && <p className="text-[10px] text-slate-400 dark:text-[#4a7a5a] mt-0.5">{student.class_name}</p>}
                {student.employee_id && <p className="text-[9px] font-mono text-slate-300 dark:text-[#2d5a3d] mt-0.5">{student.employee_id}</p>}
              </div>
              <div className="flex border-t border-[#bbf7d0] dark:border-[#1a3a24] print:hidden">
                <button onClick={() => downloadCard(student)} className="flex-1 py-2 text-[10px] text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 flex items-center justify-center gap-1 transition-colors">
                  <Download size={10} />Download
                </button>
                <Link href={`/students/${student.id}/qr`} className="flex-1 py-2 text-[10px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-center gap-1 transition-colors border-l border-[#bbf7d0] dark:border-[#1a3a24]">
                  <QrCode size={10} />Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-green-50 dark:bg-green-950/20">
              <tr className="border-b border-[#bbf7d0] dark:border-[#1a3a24]">
                <th className="table-th">Student</th>
                <th className="table-th">Class</th>
                <th className="table-th hidden sm:table-cell">ID</th>
                <th className="table-th hidden sm:table-cell">QR Preview</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id} className="table-row">
                  <td className="table-td font-medium">{student.full_name}</td>
                  <td className="table-td">{student.class_name ? <span className="badge-green">{student.class_name}</span> : "—"}</td>
                  <td className="table-td hidden sm:table-cell font-mono text-xs text-slate-400">{student.employee_id ?? "—"}</td>
                  <td className="table-td hidden sm:table-cell">
                    <QRCodeCanvas id={`qr-${student.id}`} value={student.qr_code} size={36} bgColor="#ffffff" fgColor="#0f172a" level="M" includeMargin={false} />
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <button onClick={() => downloadCard(student)} className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-green-600 dark:text-green-400 transition-colors" title="Download PNG">
                        <Download size={14} />
                      </button>
                      <Link href={`/students/${student.id}/qr`} className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-slate-400 transition-colors" title="Full card">
                        <QrCode size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <QrCode size={32} className="mx-auto text-green-200 dark:text-green-800 mb-3" />
          <p className="text-sm text-slate-400 dark:text-[#4a7a5a]">No students match your filters.</p>
        </div>
      )}
      <style>{`@media print { nav,button,select,input,.print\\:hidden{display:none!important} }`}</style>
    </div>
  );
}