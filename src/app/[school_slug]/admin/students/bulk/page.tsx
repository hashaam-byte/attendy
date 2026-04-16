'use client'
import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QRCodeCanvas } from 'qrcode.react'
import {
  ArrowLeft, Upload, Download, Printer, Users,
  CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronRight,
  FileText, Palette,
} from 'lucide-react'
import Link from 'next/link'

// ── Shared card-design config (same shape as QRCardClient) ──────────────────
interface CardConfig {
  borderRadius: number; bgColor: string; headerColor: string
  headerTextColor: string; qrFgColor: string; qrBgColor: string
  nameColor: string; classColor: string; idColor: string
  borderColor: string; borderWidth: number; nameFontSize: number
  classFontSize: number; fontFamily: string; showSchoolName: boolean
  showStudentName: boolean; showClass: boolean; showId: boolean
  showFooter: boolean; footerText: string
  logoPosition: 'header' | 'above-qr' | 'none'
  headerStyle: 'solid' | 'gradient' | 'minimal' | 'none'
  cardWidth: number; cardHeight: number; qrSize: number
  logoUrl: string; logoSize: number; shadow: boolean
  pattern: 'none' | 'dots' | 'lines'; patternOpacity: number
}

const DEFAULT_CFG: CardConfig = {
  borderRadius: 12, bgColor: '#ffffff', headerColor: '#16a34a',
  headerTextColor: '#ffffff', qrFgColor: '#000000', qrBgColor: '#ffffff',
  nameColor: '#111827', classColor: '#6b7280', idColor: '#9ca3af',
  borderColor: '#e5e7eb', borderWidth: 1, nameFontSize: 15,
  classFontSize: 12, fontFamily: 'sans-serif', showSchoolName: true,
  showStudentName: true, showClass: true, showId: true,
  showFooter: false, footerText: 'Scan QR to record attendance',
  logoPosition: 'header', headerStyle: 'solid', cardWidth: 280,
  cardHeight: 380, qrSize: 150, logoUrl: '', logoSize: 36,
  shadow: true, pattern: 'none', patternOpacity: 0.05,
}

const DESIGN_STORAGE_KEY_PREFIX = 'attendy_qr_card_design_v2_'

function loadDesign(slug: string): CardConfig {
  if (typeof window === 'undefined') return DEFAULT_CFG
  try {
    const raw = localStorage.getItem(DESIGN_STORAGE_KEY_PREFIX + slug)
    if (!raw) return DEFAULT_CFG
    return { ...DEFAULT_CFG, ...JSON.parse(raw) }
  } catch { return DEFAULT_CFG }
}

interface ParsedStudent {
  full_name: string; class: string; parent_name: string; parent_phone: string
}

interface ImportedStudent extends ParsedStudent {
  id: string; qr_code: string
}

const CLASSES = [
  'Nursery 1', 'Nursery 2', 'Nursery 3',
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3',
]

type Tab = 'import' | 'design'

export default function BulkStudentPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('import')
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [schoolName, setSchoolName] = useState('')

  // Import state
  const [csvText, setCsvText] = useState('')
  const [parsed, setParsed] = useState<ParsedStudent[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ count: number; students: ImportedStudent[] } | null>(null)
  const [importError, setImportError] = useState('')

  // Manual add state
  const [manualRows, setManualRows] = useState<ParsedStudent[]>([
    { full_name: '', class: '', parent_name: '', parent_phone: '' }
  ])

  // Design state
  const [cfg, setCfg] = useState<CardConfig>(DEFAULT_CFG)
  const [logoPreview, setLogoPreview] = useState('')
  const [printing, setPrinting] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const cardsRef = useRef<HTMLDivElement>(null)
  const [designStudents, setDesignStudents] = useState<ImportedStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: school } = await supabase
        .from('schools').select('id, name').eq('slug', school_slug).single()
      if (school) { setSchoolId(school.id); setSchoolName(school.name) }
    }
    init()
  }, [school_slug])

  // Load saved design on mount
  useEffect(() => {
    setCfg(loadDesign(school_slug))
  }, [school_slug])

  // Persist design changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(DESIGN_STORAGE_KEY_PREFIX + school_slug, JSON.stringify({ ...cfg, logoUrl: '' }))
    } catch {}
  }, [cfg, school_slug])

  // Load existing students for design tab
  useEffect(() => {
    if (tab !== 'design' || !schoolId) return
    if (importResult) {
      setDesignStudents(importResult.students)
      return
    }
    setLoadingStudents(true)
    supabase
      .from('students')
      .select('id, full_name, class, qr_code, parent_phone, parent_name')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('class').order('full_name')
      .then(({ data }) => {
        setDesignStudents((data ?? []) as ImportedStudent[])
        setLoadingStudents(false)
      })
  }, [tab, schoolId, importResult])

  // ── CSV Parser ──────────────────────────────────────────────────────────────
  function parseCSV(text: string) {
    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) {
      setParseErrors(['CSV must have a header row and at least one data row'])
      setParsed([])
      return
    }
    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
    const nameIdx = header.findIndex(h => h.includes('name') && !h.includes('parent'))
    const classIdx = header.findIndex(h => h.includes('class'))
    const parentNameIdx = header.findIndex(h => h.includes('parent') && h.includes('name'))
    const parentPhoneIdx = header.findIndex(h => h.includes('phone') || h.includes('parent_phone'))

    if (nameIdx < 0 || classIdx < 0 || parentPhoneIdx < 0) {
      setParseErrors(['CSV headers must include: full_name, class, parent_phone (parent_name is optional)'])
      setParsed([])
      return
    }

    const rows: ParsedStudent[] = []
    const errs: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const full_name = cols[nameIdx] ?? ''
      const cls = cols[classIdx] ?? ''
      const parent_name = parentNameIdx >= 0 ? (cols[parentNameIdx] ?? '') : ''
      const parent_phone = cols[parentPhoneIdx] ?? ''

      if (!full_name) { errs.push(`Row ${i + 1}: missing full_name`); continue }
      if (!cls) { errs.push(`Row ${i + 1}: missing class`); continue }
      if (!parent_phone) { errs.push(`Row ${i + 1}: missing parent_phone`); continue }

      rows.push({ full_name, class: cls, parent_name, parent_phone })
    }

    setParseErrors(errs)
    setParsed(rows)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setCsvText(text)
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  function downloadTemplate() {
    const csv = 'full_name,class,parent_name,parent_phone\nAdeola Okafor,JSS 1,Mrs Okafor,08012345678\nChidi Nwosu,Primary 3,Mr Nwosu,07098765432'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'students_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function doImport(students: ParsedStudent[]) {
    if (!schoolId) return
    setImporting(true)
    setImportError('')
    try {
      const res = await fetch('/api/bulk-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students, school_id: schoolId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.message ?? 'Import failed')
        if (data.errors) setParseErrors(data.errors)
      } else {
        setImportResult({ count: data.count, students: data.students })
      }
    } catch {
      setImportError('Network error — please try again')
    }
    setImporting(false)
  }

  function updateManualRow(i: number, field: keyof ParsedStudent, value: string) {
    setManualRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }
  function addManualRow() {
    setManualRows(prev => [...prev, { full_name: '', class: '', parent_name: '', parent_phone: '' }])
  }
  function removeManualRow(i: number) {
    setManualRows(prev => prev.filter((_, idx) => idx !== i))
  }

  // ── Print / download all cards ──────────────────────────────────────────────
  function handlePrintAll() {
    window.print()
  }

  const headerBg = cfg.headerStyle === 'gradient'
    ? `linear-gradient(135deg, ${cfg.headerColor}, ${cfg.headerColor}cc)`
    : cfg.headerStyle === 'minimal' ? 'transparent' : cfg.headerColor

  function renderCardStyles() {
    return (
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        :root {
          --bg: #080c0a; --surface: #0d1410; --border: #1a2420; --border2: #243028;
          --green: #00e676; --green-dim: rgba(0,230,118,0.08); --green-text: #4ade80;
          --text: #e2ece6; --muted: #5a7060; --muted2: #3a4e40;
          --mono: 'IBM Plex Mono', monospace; --sans: 'IBM Plex Sans', sans-serif;
        }

        .bulk-page { font-family: var(--sans); color: var(--text); min-height: 100vh; }
        .bulk-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; }
        .back-btn {
          display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
          border-radius: 7px; border: 1px solid var(--border2); background: transparent;
          color: var(--muted); cursor: pointer; text-decoration: none; transition: all 0.15s;
        }
        .back-btn:hover { background: var(--green-dim); color: var(--text); }
        .page-title { font-size: 20px; font-weight: 600; letter-spacing: -0.3px; }
        .page-sub { font-size: 11px; color: var(--muted); font-family: var(--mono); margin-top: 2px; }

        .tab-bar { display: flex; gap: 4px; margin-bottom: 24px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 4px; }
        .tab-btn {
          flex: 1; padding: 9px; border-radius: 7px; border: none; cursor: pointer;
          font-size: 12px; font-family: var(--mono); letter-spacing: 0.5px; text-transform: uppercase;
          background: transparent; color: var(--muted); transition: all 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 7px;
        }
        .tab-btn.active { background: var(--green-dim); color: var(--green-text); border: 1px solid rgba(0,230,118,0.15); }
        .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.03); color: var(--text); }

        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
        .panel-header { padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .panel-title { font-size: 12px; font-weight: 600; font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.5px; color: var(--text); }
        .panel-body { padding: 18px; }

        .upload-drop {
          border: 2px dashed var(--border2); border-radius: 10px; padding: 32px;
          text-align: center; cursor: pointer; transition: border-color 0.2s; position: relative;
        }
        .upload-drop:hover { border-color: rgba(0,230,118,0.3); }
        .upload-drop input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
        .upload-drop-icon { font-size: 28px; margin-bottom: 12px; }
        .upload-drop-label { font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
        .upload-drop-sub { font-size: 11px; color: var(--muted); font-family: var(--mono); }

        .tpl-btn {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11px; font-family: var(--mono); color: var(--green-text);
          background: var(--green-dim); border: 1px solid rgba(0,230,118,0.15);
          padding: 7px 14px; border-radius: 6px; cursor: pointer; transition: all 0.15s; margin-top: 12px;
        }
        .tpl-btn:hover { background: rgba(0,230,118,0.12); }

        .preview-table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: var(--mono); }
        .preview-table th { text-align: left; padding: 8px 10px; color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border); }
        .preview-table td { padding: 8px 10px; border-bottom: 1px solid #111c14; color: var(--text); }
        .preview-table tr:last-child td { border-bottom: none; }

        .error-list { background: rgba(255,71,87,0.06); border: 1px solid rgba(255,71,87,0.15); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
        .error-list-title { font-size: 12px; color: #f87171; font-family: var(--mono); margin-bottom: 8px; }
        .error-list ul { list-style: none; padding: 0; margin: 0; }
        .error-list li { font-size: 11px; color: #fca5a5; margin-bottom: 4px; font-family: var(--mono); }

        .import-btn {
          background: #16a34a; color: white; border: none; border-radius: 8px; padding: 12px 24px;
          font-size: 13px; font-family: var(--mono); font-weight: 600; letter-spacing: 1px;
          cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.15s;
        }
        .import-btn:hover { background: #15803d; }
        .import-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .success-banner { background: rgba(0,230,118,0.07); border: 1px solid rgba(0,230,118,0.18); border-radius: 10px; padding: 16px 18px; margin-bottom: 20px; }
        .success-title { font-size: 14px; font-weight: 600; color: var(--green-text); margin-bottom: 4px; }
        .success-sub { font-size: 12px; color: var(--muted); font-family: var(--mono); }

        .manual-row { display: grid; grid-template-columns: 2fr 1fr 1.5fr 1.5fr auto; gap: 8px; align-items: center; margin-bottom: 8px; }
        .manual-input {
          background: var(--surface2, #121a14); border: 1px solid var(--border); border-radius: 6px;
          padding: 8px 10px; font-size: 12px; font-family: var(--mono); color: var(--text); outline: none;
          transition: border-color 0.2s; width: 100%;
        }
        .manual-input:focus { border-color: rgba(0,230,118,0.3); }
        .manual-select { background: var(--surface2, #121a14); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-size: 12px; font-family: var(--mono); color: var(--text); outline: none; width: 100%; cursor: pointer; }
        .remove-btn { width: 28px; height: 28px; border-radius: 5px; border: 1px solid rgba(255,71,87,0.2); background: rgba(255,71,87,0.05); color: #f87171; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
        .remove-btn:hover { background: rgba(255,71,87,0.12); }

        /* Design tab */
        .design-layout { display: grid; grid-template-columns: 260px 1fr; gap: 16px; align-items: start; }
        @media (max-width: 800px) { .design-layout { grid-template-columns: 1fr; } .manual-row { grid-template-columns: 1fr 1fr; } }

        .ctrl-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .ctrl-row { padding: 10px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .ctrl-row:last-child { border-bottom: none; }
        .ctrl-label { font-size: 11px; color: var(--muted); font-family: var(--mono); }
        .ctrl-color-wrap { display: flex; align-items: center; gap: 6px; }
        .ctrl-color { width: 24px; height: 24px; border: none; background: none; cursor: pointer; border-radius: 4px; padding: 0; overflow: hidden; }
        .ctrl-hex { font-size: 10px; font-family: var(--mono); color: var(--text); }
        .ctrl-slider { flex: 1; height: 3px; -webkit-appearance: none; background: var(--border2); border-radius: 2px; cursor: pointer; outline: none; }
        .ctrl-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: var(--green); border-radius: 50%; cursor: pointer; }
        .ctrl-val { font-size: 10px; font-family: var(--mono); color: var(--green-text); min-width: 24px; text-align: right; }
        .ctrl-select { background: var(--surface2, #121a14); border: 1px solid var(--border2); border-radius: 5px; padding: 5px 8px; color: var(--text); font-size: 10px; font-family: var(--mono); outline: none; cursor: pointer; }
        .ctrl-toggle { width: 32px; height: 17px; background: var(--border2); border-radius: 9px; cursor: pointer; position: relative; transition: background 0.2s; border: none; flex-shrink: 0; }
        .ctrl-toggle.on { background: #16a34a; }
        .ctrl-toggle::after { content: ''; position: absolute; top: 1.5px; left: 2px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: transform 0.2s; }
        .ctrl-toggle.on::after { transform: translateX(15px); }

        .cards-grid { display: flex; flex-wrap: wrap; gap: 16px; }
        .card-wrap-outer { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .card-student-label { font-size: 10px; font-family: var(--mono); color: var(--muted); text-align: center; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .tool-btn { display: flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 7px; font-size: 12px; font-family: var(--mono); font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; }
        .tool-btn-primary { background: #16a34a; color: white; }
        .tool-btn-primary:hover { background: #15803d; }
        .tool-btn-ghost { background: transparent; border: 1px solid var(--border2); color: var(--muted); }
        .tool-btn-ghost:hover { background: var(--green-dim); color: var(--green-text); }

        .no-students { padding: 40px 20px; text-align: center; color: var(--muted); font-size: 12px; font-family: var(--mono); }

        @media print {
          .bulk-header, .tab-bar, .ctrl-panel, .toolbar, .panel { display: none !important; }
          .cards-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; }
          .card-student-label { display: none; }
          body { background: white !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    )
  }

  function ColorCtrl({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
      <div className="ctrl-row">
        <span className="ctrl-label">{label}</span>
        <div className="ctrl-color-wrap">
          <input type="color" value={value} onChange={e => onChange(e.target.value)} className="ctrl-color" />
          <span className="ctrl-hex">{value.toUpperCase()}</span>
        </div>
      </div>
    )
  }

  function SliderCtrl({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
    return (
      <div className="ctrl-row" style={{ gap: 8 }}>
        <span className="ctrl-label" style={{ minWidth: 70 }}>{label}</span>
        <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="ctrl-slider" />
        <span className="ctrl-val">{value}</span>
      </div>
    )
  }

  function QRCardMini({ student, schoolName, cfg }: { student: ImportedStudent; schoolName: string; cfg: CardConfig }) {
    const shortId = student.qr_code?.slice(0, 8).toUpperCase() ?? '--------'
    const hBg = cfg.headerStyle === 'gradient'
      ? `linear-gradient(135deg, ${cfg.headerColor}, ${cfg.headerColor}cc)`
      : cfg.headerStyle === 'minimal' ? 'transparent' : cfg.headerColor

    return (
      <div style={{
        width: cfg.cardWidth, minHeight: cfg.cardHeight, backgroundColor: cfg.bgColor,
        borderRadius: cfg.borderRadius,
        border: cfg.borderWidth > 0 ? `${cfg.borderWidth}px solid ${cfg.borderColor}` : 'none',
        boxShadow: cfg.shadow ? '0 4px 16px rgba(0,0,0,0.15)' : 'none',
        fontFamily: cfg.fontFamily, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}>
        {cfg.headerStyle !== 'none' && (
          <div style={{
            background: hBg,
            borderBottom: cfg.headerStyle === 'minimal' ? `2px solid ${cfg.headerColor}` : 'none',
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {cfg.logoPosition === 'header' && (
              <div style={{ width: cfg.logoSize * 0.7, height: cfg.logoSize * 0.7, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {cfg.logoUrl
                  ? <img src={cfg.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill={cfg.headerTextColor} opacity={0.8}><path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3z"/></svg>
                }
              </div>
            )}
            {cfg.showSchoolName && (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: cfg.headerStyle === 'minimal' ? cfg.headerColor : cfg.headerTextColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{schoolName}</div>
                <div style={{ fontSize: 8, color: cfg.headerStyle === 'minimal' ? cfg.headerColor : cfg.headerTextColor, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student ID Card</div>
              </div>
            )}
          </div>
        )}
        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ padding: 8, background: cfg.qrBgColor, borderRadius: 8, border: `1px solid ${cfg.borderColor}` }}>
            {student.qr_code
              ? <QRCodeCanvas value={student.qr_code} size={cfg.qrSize * 0.85} bgColor={cfg.qrBgColor} fgColor={cfg.qrFgColor} level="H" />
              : <div style={{ width: cfg.qrSize * 0.85, height: cfg.qrSize * 0.85, background: '#eee', borderRadius: 4 }} />
            }
          </div>
          <div style={{ textAlign: 'center', width: '100%' }}>
            {cfg.showStudentName && <div style={{ fontSize: cfg.nameFontSize * 0.9, fontWeight: 700, color: cfg.nameColor, marginBottom: 3, lineHeight: 1.2 }}>{student.full_name}</div>}
            {cfg.showClass && <div style={{ fontSize: cfg.classFontSize * 0.9, color: cfg.classColor }}>{student.class}</div>}
            {cfg.showId && <div style={{ fontSize: 9, color: cfg.idColor, fontFamily: 'monospace', letterSpacing: '1px', background: `${cfg.headerColor}10`, padding: '2px 8px', borderRadius: 3, display: 'inline-block', marginTop: 4 }}>{shortId}</div>}
          </div>
          {cfg.showFooter && cfg.footerText && (
            <div style={{ fontSize: 8, color: cfg.classColor, opacity: 0.6, textAlign: 'center', borderTop: `1px solid ${cfg.borderColor}`, paddingTop: 8, width: '100%', letterSpacing: '0.3px' }}>{cfg.footerText}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bulk-page">
      {renderCardStyles()}

      <div className="bulk-header">
        <Link href={`/${school_slug}/admin/students`} className="back-btn">
          <ArrowLeft size={15} />
        </Link>
        <div>
          <div className="page-title">Bulk Student Manager</div>
          <div className="page-sub">Import students via CSV · Design & print all QR cards at once</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'import' ? 'active' : ''}`} onClick={() => setTab('import')}>
          <Users size={13} />
          Bulk Import
        </button>
        <button className={`tab-btn ${tab === 'design' ? 'active' : ''}`} onClick={() => setTab('design')}>
          <Palette size={13} />
          Bulk QR Designer
        </button>
      </div>

      {/* ── IMPORT TAB ── */}
      {tab === 'import' && (
        <div>
          {importResult && (
            <div className="success-banner">
              <div className="success-title">✓ {importResult.count} students imported successfully!</div>
              <div className="success-sub">Switch to the Bulk QR Designer tab to print their ID cards.</div>
              <button className="tool-btn tool-btn-primary" style={{ marginTop: 12, cursor: 'pointer' }} onClick={() => setTab('design')}>
                <Palette size={13} />
                Go to QR Designer
              </button>
            </div>
          )}

          {/* CSV Upload */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">CSV Upload</span>
            </div>
            <div className="panel-body">
              <div className="upload-drop">
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload} />
                <Upload size={28} color="#3a4e40" style={{ margin: '0 auto 10px', display: 'block' }} />
                <div className="upload-drop-label">Drop a CSV file here or click to browse</div>
                <div className="upload-drop-sub">Required columns: full_name, class, parent_phone</div>
              </div>
              <button className="tpl-btn" onClick={downloadTemplate}>
                <Download size={12} />
                Download CSV template
              </button>
            </div>
          </div>

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="error-list">
              <div className="error-list-title">
                <AlertCircle size={12} style={{ display: 'inline', marginRight: 6 }} />
                {parseErrors.length} issue{parseErrors.length !== 1 ? 's' : ''} found
              </div>
              <ul>
                {parseErrors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                {parseErrors.length > 10 && <li>...and {parseErrors.length - 10} more</li>}
              </ul>
            </div>
          )}

          {/* Parsed preview */}
          {parsed.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Preview — {parsed.length} students</span>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Full Name</th>
                      <th>Class</th>
                      <th>Parent Name</th>
                      <th>Parent Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((s, i) => (
                      <tr key={i}>
                        <td style={{ color: '#3a4e40' }}>{i + 1}</td>
                        <td>{s.full_name}</td>
                        <td>{s.class}</td>
                        <td style={{ color: '#5a7060' }}>{s.parent_name || '—'}</td>
                        <td>{s.parent_phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '14px 18px', borderTop: '1px solid #1a2420', display: 'flex', gap: 12, alignItems: 'center' }}>
                {importError && <span style={{ fontSize: 12, color: '#f87171', fontFamily: 'IBM Plex Mono, monospace' }}>{importError}</span>}
                <button className="import-btn" disabled={importing || parsed.length === 0} onClick={() => doImport(parsed)}>
                  {importing ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle size={14} />}
                  {importing ? 'Importing...' : `Import ${parsed.length} Students`}
                </button>
              </div>
            </div>
          )}

          {/* Manual entry */}
          <div className="panel" style={{ marginTop: 8 }}>
            <div className="panel-header">
              <span className="panel-title">Manual Entry</span>
              <button className="tpl-btn" style={{ margin: 0 }} onClick={addManualRow}>+ Add Row</button>
            </div>
            <div className="panel-body">
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3a4e40', marginBottom: 10, display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr auto', gap: 8 }}>
                <span>FULL NAME *</span><span>CLASS *</span><span>PARENT NAME</span><span>PARENT PHONE *</span><span></span>
              </div>
              {manualRows.map((row, i) => (
                <div key={i} className="manual-row">
                  <input className="manual-input" placeholder="e.g. Adaeze Okafor" value={row.full_name} onChange={e => updateManualRow(i, 'full_name', e.target.value)} />
                  <select className="manual-select" value={row.class} onChange={e => updateManualRow(i, 'class', e.target.value)}>
                    <option value="">Select...</option>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input className="manual-input" placeholder="Parent name" value={row.parent_name} onChange={e => updateManualRow(i, 'parent_name', e.target.value)} />
                  <input className="manual-input" placeholder="08012345678" value={row.parent_phone} onChange={e => updateManualRow(i, 'parent_phone', e.target.value)} />
                  <button className="remove-btn" onClick={() => removeManualRow(i)} disabled={manualRows.length === 1}>×</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                {importError && <span style={{ fontSize: 12, color: '#f87171', fontFamily: 'IBM Plex Mono, monospace', flex: 1 }}>{importError}</span>}
                <button
                  className="import-btn"
                  disabled={importing || manualRows.every(r => !r.full_name)}
                  onClick={() => doImport(manualRows.filter(r => r.full_name && r.class && r.parent_phone))}
                >
                  {importing ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle size={14} />}
                  {importing ? 'Importing...' : `Add ${manualRows.filter(r => r.full_name && r.class && r.parent_phone).length} Students`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DESIGN TAB ── */}
      {tab === 'design' && (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, color: '#5a7060', fontFamily: 'IBM Plex Mono, monospace', background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.1)', borderRadius: 8, padding: '10px 14px' }}>
            Design one card — all student cards update instantly. Design is auto-saved across sessions.
          </div>
          <div className="design-layout">
            {/* Controls */}
            <div>
              <div className="ctrl-panel">
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a2420', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#5a7060', letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Palette size={11} color="#4ade80" />
                  Card Controls
                </div>

                <ColorCtrl label="Background" value={cfg.bgColor} onChange={v => setCfg(c => ({ ...c, bgColor: v }))} />
                <ColorCtrl label="Header" value={cfg.headerColor} onChange={v => setCfg(c => ({ ...c, headerColor: v }))} />
                <ColorCtrl label="Header text" value={cfg.headerTextColor} onChange={v => setCfg(c => ({ ...c, headerTextColor: v }))} />
                <ColorCtrl label="QR color" value={cfg.qrFgColor} onChange={v => setCfg(c => ({ ...c, qrFgColor: v }))} />
                <ColorCtrl label="Name color" value={cfg.nameColor} onChange={v => setCfg(c => ({ ...c, nameColor: v }))} />
                <ColorCtrl label="Class color" value={cfg.classColor} onChange={v => setCfg(c => ({ ...c, classColor: v }))} />
                <ColorCtrl label="Border" value={cfg.borderColor} onChange={v => setCfg(c => ({ ...c, borderColor: v }))} />

                <SliderCtrl label="Width" value={cfg.cardWidth} min={200} max={350} onChange={v => setCfg(c => ({ ...c, cardWidth: v }))} />
                <SliderCtrl label="Height" value={cfg.cardHeight} min={260} max={480} onChange={v => setCfg(c => ({ ...c, cardHeight: v }))} />
                <SliderCtrl label="QR size" value={cfg.qrSize} min={80} max={200} onChange={v => setCfg(c => ({ ...c, qrSize: v }))} />
                <SliderCtrl label="Radius" value={cfg.borderRadius} min={0} max={40} onChange={v => setCfg(c => ({ ...c, borderRadius: v }))} />
                <SliderCtrl label="Name px" value={cfg.nameFontSize} min={10} max={22} onChange={v => setCfg(c => ({ ...c, nameFontSize: v }))} />

                <div className="ctrl-row">
                  <span className="ctrl-label">Header style</span>
                  <select className="ctrl-select" value={cfg.headerStyle} onChange={e => setCfg(c => ({ ...c, headerStyle: e.target.value as any }))}>
                    <option value="solid">Solid</option>
                    <option value="gradient">Gradient</option>
                    <option value="minimal">Minimal</option>
                    <option value="none">None</option>
                  </select>
                </div>

                <div className="ctrl-row">
                  <span className="ctrl-label">Font</span>
                  <select className="ctrl-select" value={cfg.fontFamily} onChange={e => setCfg(c => ({ ...c, fontFamily: e.target.value }))}>
                    <option value="sans-serif">Sans</option>
                    <option value="serif">Serif</option>
                    <option value="monospace">Mono</option>
                    <option value="'Georgia', serif">Georgia</option>
                  </select>
                </div>

                {[
                  ['showSchoolName', 'School name'],
                  ['showStudentName', 'Student name'],
                  ['showClass', 'Class'],
                  ['showId', 'Short ID'],
                  ['shadow', 'Shadow'],
                  ['showFooter', 'Footer'],
                ].map(([key, label]) => (
                  <div key={key} className="ctrl-row">
                    <span className="ctrl-label">{label}</span>
                    <button
                      className={`ctrl-toggle ${(cfg as any)[key] ? 'on' : ''}`}
                      onClick={() => setCfg(c => ({ ...c, [key]: !(c as any)[key] }))}
                    />
                  </div>
                ))}

                <div className="ctrl-row">
                  <span className="ctrl-label">Logo</span>
                  <div className="upload-drop" style={{ padding: 8, border: 'none', textAlign: 'left', flexShrink: 0 }}>
                    <input type="file" accept="image/*" onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => {
                        const url = ev.target?.result as string
                        setLogoPreview(url)
                        setCfg(c => ({ ...c, logoUrl: url }))
                      }
                      reader.readAsDataURL(file)
                    }} />
                    <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: logoPreview ? '#4ade80' : '#3a4e40', cursor: 'pointer' }}>
                      {logoPreview ? '✓ Uploaded' : '+ Upload logo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards grid */}
            <div>
              <div className="toolbar">
                <button className="tool-btn tool-btn-primary" onClick={handlePrintAll}>
                  <Printer size={13} />
                  Print All Cards
                </button>
                <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#3a4e40', alignSelf: 'center' }}>
                  {designStudents.length} student{designStudents.length !== 1 ? 's' : ''}
                </span>
              </div>

              {loadingStudents ? (
                <div className="no-students">
                  <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 10px', display: 'block' }} />
                  Loading students...
                </div>
              ) : designStudents.length === 0 ? (
                <div className="no-students">
                  No students yet — import some first, or{' '}
                  <button style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setTab('import')}>
                    go to Import tab
                  </button>
                </div>
              ) : (
                <div className="cards-grid" ref={cardsRef}>
                  {designStudents.map(s => (
                    <div key={s.id} className="card-wrap-outer">
                      <QRCardMini student={s} schoolName={schoolName} cfg={cfg} />
                      <div className="card-student-label">{s.full_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}