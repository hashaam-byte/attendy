'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Student } from '@/lib/supabase/types'
import {
  ArrowLeft, Printer, Download, Share2, Palette, Layout, Type,
  Image as ImageIcon, RotateCcw, ChevronDown, ChevronRight,
  Check, Loader2, Users,
} from 'lucide-react'
import Link from 'next/link'

interface CardConfig {
  borderRadius: number
  bgColor: string
  headerColor: string
  headerTextColor: string
  qrFgColor: string
  qrBgColor: string
  nameColor: string
  classColor: string
  idColor: string
  borderColor: string
  borderWidth: number
  nameFontSize: number
  classFontSize: number
  fontFamily: string
  showLogo: boolean
  showSchoolName: boolean
  showStudentName: boolean
  showClass: boolean
  showId: boolean
  showFooter: boolean
  footerText: string
  logoPosition: 'header' | 'above-qr' | 'none'
  headerStyle: 'solid' | 'gradient' | 'minimal' | 'none'
  cardWidth: number
  cardHeight: number
  qrSize: number
  logoUrl: string
  logoSize: number
  shadow: boolean
  pattern: 'none' | 'dots' | 'lines' | 'grid'
  patternOpacity: number
}

const PRESETS: Record<string, Partial<CardConfig>> = {
  classic: {
    bgColor: '#ffffff', headerColor: '#16a34a', headerTextColor: '#ffffff',
    qrFgColor: '#000000', qrBgColor: '#ffffff', nameColor: '#111827',
    classColor: '#6b7280', idColor: '#9ca3af', borderColor: '#e5e7eb',
    borderWidth: 1, borderRadius: 12, headerStyle: 'solid', pattern: 'none',
    shadow: true, fontFamily: 'sans-serif',
  },
  dark: {
    bgColor: '#0f172a', headerColor: '#1e293b', headerTextColor: '#e2e8f0',
    qrFgColor: '#e2e8f0', qrBgColor: '#0f172a', nameColor: '#f1f5f9',
    classColor: '#94a3b8', idColor: '#475569', borderColor: '#334155',
    borderWidth: 1, borderRadius: 16, headerStyle: 'solid', pattern: 'dots',
    shadow: false, fontFamily: 'monospace',
  },
  vibrant: {
    bgColor: '#fefce8', headerColor: '#7c3aed', headerTextColor: '#ffffff',
    qrFgColor: '#4c1d95', qrBgColor: '#fefce8', nameColor: '#1e1b4b',
    classColor: '#6d28d9', idColor: '#a78bfa', borderColor: '#ddd6fe',
    borderWidth: 2, borderRadius: 20, headerStyle: 'gradient', pattern: 'none',
    shadow: true, fontFamily: 'sans-serif',
  },
  minimal: {
    bgColor: '#fafafa', headerColor: '#fafafa', headerTextColor: '#111827',
    qrFgColor: '#111827', qrBgColor: '#fafafa', nameColor: '#111827',
    classColor: '#374151', idColor: '#9ca3af', borderColor: '#d1d5db',
    borderWidth: 1, borderRadius: 4, headerStyle: 'minimal', pattern: 'none',
    shadow: false, fontFamily: 'serif',
  },
  corporate: {
    bgColor: '#ffffff', headerColor: '#1e3a5f', headerTextColor: '#ffffff',
    qrFgColor: '#1e3a5f', qrBgColor: '#ffffff', nameColor: '#1e3a5f',
    classColor: '#4b6584', idColor: '#a4b0be', borderColor: '#dfe4ea',
    borderWidth: 2, borderRadius: 8, headerStyle: 'solid', pattern: 'lines',
    shadow: true, fontFamily: 'sans-serif',
  },
}

const DEFAULT_CONFIG: CardConfig = {
  borderRadius: 12, bgColor: '#ffffff', headerColor: '#16a34a',
  headerTextColor: '#ffffff', qrFgColor: '#000000', qrBgColor: '#ffffff',
  nameColor: '#111827', classColor: '#6b7280', idColor: '#9ca3af',
  borderColor: '#e5e7eb', borderWidth: 1, nameFontSize: 15,
  classFontSize: 12, fontFamily: 'sans-serif', showLogo: true,
  showSchoolName: true, showStudentName: true, showClass: true,
  showId: true, showFooter: false, footerText: 'Scan QR to record attendance',
  logoPosition: 'header', headerStyle: 'solid', cardWidth: 280,
  cardHeight: 380, qrSize: 150, logoUrl: '', logoSize: 36,
  shadow: true, pattern: 'none', patternOpacity: 0.05,
}

// ── localStorage helpers (keyed per school so multiple schools don't clash)
function getStorageKey(schoolSlug: string) {
  return `attendy_qr_card_design_v2_${schoolSlug}`
}
function loadSavedConfig(schoolSlug: string): CardConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(getStorageKey(schoolSlug))
    if (!raw) return DEFAULT_CONFIG
    const parsed = JSON.parse(raw)
    // Merge with defaults so new keys added later don't break old saves
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return DEFAULT_CONFIG
  }
}
function saveConfig(schoolSlug: string, cfg: CardConfig) {
  if (typeof window === 'undefined') return
  try {
    // Don't persist logoUrl (can be large base64) — user re-uploads each session
    const toStore = { ...cfg, logoUrl: '' }
    localStorage.setItem(getStorageKey(schoolSlug), JSON.stringify(toStore))
  } catch {
    // quota exceeded — silently ignore
  }
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="ctrl-section">
      <button className="ctrl-section-header" onClick={() => setOpen(o => !o)}>
        {icon}
        <span>{title}</span>
        {open
          ? <ChevronDown size={13} style={{ marginLeft: 'auto' }} />
          : <ChevronRight size={13} style={{ marginLeft: 'auto' }} />}
      </button>
      {open && <div className="ctrl-section-body">{children}</div>}
    </div>
  )
}

function ColorRow({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="color-row">
      <span className="color-label">{label}</span>
      <div className="color-input-wrap">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="color-native" />
        <span className="color-hex">{value.toUpperCase()}</span>
      </div>
    </div>
  )
}

function SliderRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void
}) {
  return (
    <div className="slider-row">
      <div className="slider-labels">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))} className="slider" />
    </div>
  )
}

export default function QRCardClient({
  student, schoolName, schoolSlug,
}: {
  student: Student; schoolName: string; schoolSlug: string
}) {
  // ── Load persisted config on first render ──
  const [cfg, setCfg] = useState<CardConfig>(() => loadSavedConfig(schoolSlug))
  const [logoPreview, setLogoPreview] = useState<string>('')
  const cardRef = useRef<HTMLDivElement>(null)

  // ── Persist design whenever cfg changes ──
  useEffect(() => {
    saveConfig(schoolSlug, cfg)
  }, [cfg, schoolSlug])

  const update = (patch: Partial<CardConfig>) =>
    setCfg(c => ({ ...c, ...patch }))

  const applyPreset = (name: string) => {
    const preset = PRESETS[name]
    if (preset) setCfg(c => ({ ...c, ...preset }))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const url = ev.target?.result as string
      setLogoPreview(url)
      update({ logoUrl: url })
    }
    reader.readAsDataURL(file)
  }

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'done'>('idle')
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'done' | 'copied'>('idle')

  const handlePrint = () => window.print()

  async function renderCardToBlob(): Promise<Blob | null> {
    const cardEl = cardRef.current?.querySelector('.qr-card') as HTMLElement | null
    if (!cardEl) return null
    const scale = 2
    const rect = cardEl.getBoundingClientRect()
    const w = Math.round(rect.width)
    const h = Math.round(rect.height)
    const canvas = document.createElement('canvas')
    canvas.width = w * scale
    canvas.height = h * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.scale(scale, scale)

    const r = cfg.borderRadius
    ctx.fillStyle = cfg.bgColor
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.lineTo(w - r, 0)
    ctx.quadraticCurveTo(w, 0, w, r)
    ctx.lineTo(w, h - r)
    ctx.quadraticCurveTo(w, h, w - r, h)
    ctx.lineTo(r, h)
    ctx.quadraticCurveTo(0, h, 0, h - r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
    ctx.closePath()
    ctx.fill()
    ctx.clip()

    if (cfg.borderWidth > 0) {
      ctx.strokeStyle = cfg.borderColor
      ctx.lineWidth = cfg.borderWidth
      ctx.stroke()
    }

    if (cfg.headerStyle !== 'none') {
      const headerEl = cardEl.querySelector('.card-header') as HTMLElement | null
      if (headerEl) {
        const headerH = headerEl.offsetHeight
        if (cfg.headerStyle === 'gradient') {
          const grad = ctx.createLinearGradient(0, 0, w, headerH)
          grad.addColorStop(0, cfg.headerColor)
          grad.addColorStop(1, cfg.headerColor + 'cc')
          ctx.fillStyle = grad
        } else if (cfg.headerStyle === 'minimal') {
          ctx.fillStyle = cfg.bgColor
        } else {
          ctx.fillStyle = cfg.headerColor
        }
        ctx.fillRect(0, 0, w, headerH)
        if (cfg.headerStyle === 'minimal') {
          ctx.fillStyle = cfg.headerColor
          ctx.fillRect(0, headerH - 2, w, 2)
        }
        const logoX = 16, logoY = (headerH - cfg.logoSize) / 2
        if (cfg.logoPosition === 'header' && cfg.logoUrl) {
          try {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            await new Promise<void>((res) => {
              img.onload = () => {
                ctx.save()
                ctx.beginPath()
                ctx.roundRect(logoX, logoY, cfg.logoSize, cfg.logoSize, 8)
                ctx.clip()
                ctx.drawImage(img, logoX, logoY, cfg.logoSize, cfg.logoSize)
                ctx.restore()
                res()
              }
              img.onerror = () => res()
              img.src = cfg.logoUrl
            })
          } catch {}
        }
        if (cfg.showSchoolName) {
          const textX = cfg.logoPosition === 'header' ? logoX + cfg.logoSize + 10 : 16
          const textColor = cfg.headerStyle === 'minimal' ? cfg.headerColor : cfg.headerTextColor
          ctx.fillStyle = textColor
          ctx.font = `700 13px ${cfg.fontFamily}`
          ctx.fillText(schoolName, textX, headerH / 2 - 2)
          ctx.font = `400 9px ${cfg.fontFamily}`
          ctx.globalAlpha = 0.7
          ctx.fillText('STUDENT ID CARD', textX, headerH / 2 + 11)
          ctx.globalAlpha = 1
        }
      }
    }

    const qrCanvas = cardEl.querySelector('canvas') as HTMLCanvasElement | null
    if (qrCanvas) {
      const qrEl = qrCanvas.closest('div') as HTMLElement
      const qrRect = qrEl.getBoundingClientRect()
      const cardRect = cardEl.getBoundingClientRect()
      const qrX = qrRect.left - cardRect.left
      const qrY = qrRect.top - cardRect.top
      const pad = 10
      ctx.fillStyle = cfg.qrBgColor
      ctx.beginPath()
      ctx.roundRect(qrX, qrY, qrRect.width, qrRect.height, 10)
      ctx.fill()
      if (cfg.borderWidth > 0) {
        ctx.strokeStyle = cfg.borderColor
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
      ctx.drawImage(qrCanvas, qrX + pad, qrY + pad, cfg.qrSize, cfg.qrSize)
    }

    const bodyEl = cardEl.querySelector('.card-body') as HTMLElement | null
    if (bodyEl) {
      const headerEl2 = cardEl.querySelector('.card-header') as HTMLElement | null
      const headerH = headerEl2 ? headerEl2.offsetHeight : 0
      let textY = headerH + bodyEl.offsetHeight - (cfg.showFooter ? 50 : 30)

      if (cfg.showStudentName) {
        ctx.fillStyle = cfg.nameColor
        ctx.font = `700 ${cfg.nameFontSize}px ${cfg.fontFamily}`
        ctx.textAlign = 'center'
        ctx.fillText(student.full_name, w / 2, textY)
        textY += cfg.nameFontSize + 4
      }
      if (cfg.showClass) {
        ctx.fillStyle = cfg.classColor
        ctx.font = `400 ${cfg.classFontSize}px ${cfg.fontFamily}`
        ctx.textAlign = 'center'
        ctx.fillText(student.class, w / 2, textY)
        textY += cfg.classFontSize + 8
      }
      if (cfg.showId) {
        const idText = student.qr_code.slice(0, 8).toUpperCase()
        ctx.fillStyle = cfg.headerColor + '22'
        const idW = 80, idH = 18
        ctx.fillRect(w / 2 - idW / 2, textY - 13, idW, idH)
        ctx.fillStyle = cfg.idColor
        ctx.font = `400 10px monospace`
        ctx.textAlign = 'center'
        ctx.fillText(idText, w / 2, textY)
      }
      ctx.textAlign = 'left'
    }

    return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png', 1.0))
  }

  async function handleDownload() {
    setSaveStatus('saving')
    try {
      const blob = await renderCardToBlob()
      if (!blob) { setSaveStatus('idle'); return }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${student.full_name.replace(/\s+/g, '-')}-QR-card.png`
      a.click()
      URL.revokeObjectURL(url)
      setSaveStatus('done')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('idle')
    }
  }

  async function handleShare() {
    setShareStatus('sharing')
    try {
      const blob = await renderCardToBlob()
      if (!blob) { setShareStatus('idle'); return }
      const file = new File([blob], `${student.full_name}-QR-card.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `QR Card — ${student.full_name}`,
          text: `Attendance QR card for ${student.full_name} (${student.class})`,
          files: [file],
        })
        setShareStatus('done')
        setTimeout(() => setShareStatus('idle'), 2000)
      } else {
        try {
          const item = new ClipboardItem({ 'image/png': blob })
          await navigator.clipboard.write([item])
          setShareStatus('copied')
          setTimeout(() => setShareStatus('idle'), 2500)
        } catch {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${student.full_name.replace(/\s+/g, '-')}-QR-card.png`
          a.click()
          URL.revokeObjectURL(url)
          setShareStatus('done')
          setTimeout(() => setShareStatus('idle'), 2500)
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error(err)
      setShareStatus('idle')
    }
  }

  const shortId = student.qr_code.slice(0, 8).toUpperCase()

  const patternSvg = {
    dots: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23000'/%3E%3C/svg%3E")`,
    lines: `url("data:image/svg+xml,%3Csvg width='10' height='10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 5h10' stroke='%23000' stroke-width='0.5'/%3E%3C/svg%3E")`,
    grid: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20' fill='none' stroke='%23000' stroke-width='0.5'/%3E%3C/svg%3E")`,
    none: 'none',
  }

  const headerBg = cfg.headerStyle === 'gradient'
    ? `linear-gradient(135deg, ${cfg.headerColor}, ${cfg.headerColor}cc)`
    : cfg.headerStyle === 'minimal' ? 'transparent'
    : cfg.headerColor

  return (
    <div className="qr-designer">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        :root {
          --bg: #080c0a; --surface: #0d1410; --surface2: #121a14;
          --border: #1a2420; --border2: #243028;
          --green: #00e676; --green-dim: rgba(0,230,118,0.08);
          --green-text: #4ade80; --text: #e2ece6;
          --muted: #5a7060; --muted2: #3a4e40;
          --mono: 'IBM Plex Mono', monospace;
          --sans: 'IBM Plex Sans', sans-serif;
        }
        .qr-designer { font-family: var(--sans); color: var(--text); min-height: 100vh; }

        .qr-header { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
        .back-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 7px;
          border: 1px solid var(--border2); background: transparent;
          color: var(--muted); cursor: pointer; text-decoration: none; transition: all 0.15s;
        }
        .back-btn:hover { background: var(--green-dim); color: var(--text); border-color: rgba(0,230,118,0.2); }
        .qr-page-title { font-size: 20px; font-weight: 600; letter-spacing: -0.3px; }
        .qr-page-sub { font-size: 11px; color: var(--muted); font-family: var(--mono); margin-top: 2px; }

        .persist-badge {
          margin-left: auto;
          font-size: 10px; font-family: var(--mono); letter-spacing: 0.5px;
          color: var(--green-text);
          background: rgba(0,230,118,0.07);
          border: 1px solid rgba(0,230,118,0.15);
          padding: 4px 10px; border-radius: 4px;
        }

        .qr-layout { display: grid; grid-template-columns: 300px 1fr; gap: 20px; align-items: start; }
        @media (max-width: 900px) { .qr-layout { grid-template-columns: 1fr; } }

        .controls-panel {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; overflow: hidden;
          position: sticky; top: 80px;
          max-height: calc(100vh - 110px); overflow-y: auto;
        }
        .controls-panel::-webkit-scrollbar { width: 4px; }
        .controls-panel::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        .controls-top {
          padding: 14px 16px; border-bottom: 1px solid var(--border);
          font-size: 11px; font-family: var(--mono); color: var(--muted);
          letter-spacing: 1px; text-transform: uppercase;
          display: flex; align-items: center; gap: 8px;
        }
        .controls-top svg { color: var(--green-text); }

        .preset-bar {
          padding: 12px 16px; border-bottom: 1px solid var(--border);
          display: flex; gap: 6px; flex-wrap: wrap;
        }
        .preset-btn {
          font-size: 10px; font-family: var(--mono); letter-spacing: 0.5px;
          padding: 4px 10px; border-radius: 4px;
          border: 1px solid var(--border2); background: transparent;
          color: var(--muted); cursor: pointer; text-transform: uppercase; transition: all 0.15s;
        }
        .preset-btn:hover { background: var(--green-dim); color: var(--green-text); border-color: rgba(0,230,118,0.2); }

        .ctrl-section { border-bottom: 1px solid var(--border); }
        .ctrl-section:last-child { border-bottom: none; }
        .ctrl-section-header {
          width: 100%; padding: 11px 16px;
          display: flex; align-items: center; gap: 8px;
          background: transparent; border: none; color: var(--muted);
          font-size: 11px; font-family: var(--mono); letter-spacing: 0.5px; text-transform: uppercase;
          cursor: pointer; text-align: left; transition: background 0.15s, color 0.15s;
        }
        .ctrl-section-header:hover { background: rgba(255,255,255,0.02); color: var(--text); }
        .ctrl-section-header svg { color: var(--green-text); flex-shrink: 0; }
        .ctrl-section-body { padding: 10px 16px 14px; }

        .color-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
        .color-label { font-size: 11px; color: var(--muted); flex: 1; }
        .color-input-wrap {
          display: flex; align-items: center; gap: 6px;
          background: var(--surface2); border: 1px solid var(--border2);
          border-radius: 5px; padding: 3px 8px 3px 4px;
        }
        .color-native { width: 20px; height: 20px; border: none; background: none; padding: 0; cursor: pointer; border-radius: 3px; overflow: hidden; }
        .color-hex { font-size: 10px; font-family: var(--mono); color: var(--text); }

        .slider-row { margin-bottom: 10px; }
        .slider-labels { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .slider-label { font-size: 11px; color: var(--muted); }
        .slider-value { font-size: 10px; font-family: var(--mono); color: var(--green-text); }
        .slider { width: 100%; height: 3px; -webkit-appearance: none; background: var(--border2); border-radius: 2px; outline: none; cursor: pointer; }
        .slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: var(--green); border-radius: 50%; cursor: pointer; }

        .toggle-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .toggle-label { font-size: 11px; color: var(--muted); }
        .toggle { width: 34px; height: 18px; background: var(--border2); border-radius: 9px; cursor: pointer; position: relative; transition: background 0.2s; border: none; flex-shrink: 0; }
        .toggle.on { background: #16a34a; }
        .toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: transform 0.2s; }
        .toggle.on::after { transform: translateX(16px); }

        .select-field { width: 100%; background: var(--surface2); border: 1px solid var(--border2); border-radius: 5px; padding: 7px 10px; color: var(--text); font-size: 11px; font-family: var(--mono); outline: none; margin-top: 4px; cursor: pointer; }
        .text-field { width: 100%; background: var(--surface2); border: 1px solid var(--border2); border-radius: 5px; padding: 7px 10px; color: var(--text); font-size: 12px; font-family: var(--sans); outline: none; margin-top: 4px; }
        .text-field:focus { border-color: rgba(0,230,118,0.3); }

        .upload-area { border: 1px dashed var(--border2); border-radius: 7px; padding: 14px; text-align: center; cursor: pointer; transition: border-color 0.15s; position: relative; margin-top: 6px; }
        .upload-area:hover { border-color: rgba(0,230,118,0.3); }
        .upload-area input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
        .upload-text { font-size: 11px; color: var(--muted); font-family: var(--mono); }

        .ctrl-row-label { font-size: 10px; color: var(--muted); font-family: var(--mono); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 4px; margin-top: 8px; }

        .preview-area { display: flex; flex-direction: column; gap: 16px; }
        .preview-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .toolbar-label { font-size: 11px; font-family: var(--mono); color: var(--muted); letter-spacing: 1px; text-transform: uppercase; flex: 1; }

        .action-btn { display: flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 7px; font-size: 12px; font-family: var(--mono); font-weight: 500; letter-spacing: 0.5px; cursor: pointer; border: none; transition: all 0.15s; }
        .action-btn-primary { background: #16a34a; color: white; }
        .action-btn-primary:hover { background: #15803d; }
        .action-btn-ghost { background: transparent; border: 1px solid var(--border2); color: var(--muted); }
        .action-btn-ghost:hover { background: var(--green-dim); color: var(--green-text); border-color: rgba(0,230,118,0.2); }

        .preview-stage {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 40px 20px;
          display: flex; align-items: center; justify-content: center;
          min-height: 480px; position: relative; overflow: hidden;
        }
        .preview-stage::before {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 20px 20px; pointer-events: none;
        }

        .qr-card-wrap { position: relative; z-index: 1; }
        .qr-card { position: relative; overflow: hidden; display: flex; flex-direction: column; }
        .card-pattern { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .card-header { position: relative; z-index: 1; }
        .card-body { position: relative; z-index: 1; flex: 1; }

        @media print {
          body * { visibility: hidden !important; }
          .qr-card-wrap, .qr-card-wrap * { visibility: visible !important; }
          .qr-card-wrap { position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; z-index: 9999 !important; }
        }
      `}</style>

      <div className="qr-header">
        <Link href={`/${schoolSlug}/admin/students`} className="back-btn">
          <ArrowLeft size={15} />
        </Link>
        <div>
          <div className="qr-page-title">QR Card Designer</div>
          <div className="qr-page-sub">{student.full_name} · {student.class}</div>
        </div>
        <span className="persist-badge">Design auto-saved</span>
      </div>

      {/* Bulk design link */}
      <div style={{
        background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.12)',
        borderRadius: 8, padding: '10px 14px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: '#4ade80',
      }}>
        <Users size={13} />
        Want to generate cards for all students at once?{' '}
        <Link
          href={`/${schoolSlug}/admin/students/bulk`}
          style={{ color: '#00e676', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Go to Bulk QR Designer →
        </Link>
      </div>

      <div className="qr-layout">
        {/* Controls */}
        <div className="controls-panel">
          <div className="controls-top">
            <Palette size={13} />
            Card Customizer
          </div>

          <div className="preset-bar">
            {Object.keys(PRESETS).map(name => (
              <button key={name} className="preset-btn" onClick={() => applyPreset(name)}>
                {name}
              </button>
            ))}
          </div>

          <Section title="Shape & Size" icon={<Layout size={12} />}>
            <SliderRow label="Card Width" value={cfg.cardWidth} min={220} max={360} onChange={v => update({ cardWidth: v })} />
            <SliderRow label="Card Height" value={cfg.cardHeight} min={280} max={500} onChange={v => update({ cardHeight: v })} />
            <SliderRow label="Corner Radius" value={cfg.borderRadius} min={0} max={40} onChange={v => update({ borderRadius: v })} />
            <SliderRow label="QR Code Size" value={cfg.qrSize} min={100} max={220} onChange={v => update({ qrSize: v })} />
            <SliderRow label="Border Width" value={cfg.borderWidth} min={0} max={6} onChange={v => update({ borderWidth: v })} />
          </Section>

          <Section title="Header Style" icon={<Layout size={12} />} defaultOpen={false}>
            <div className="ctrl-row-label">Header Type</div>
            <select className="select-field" value={cfg.headerStyle} onChange={e => update({ headerStyle: e.target.value as any })}>
              <option value="solid">Solid Color</option>
              <option value="gradient">Gradient</option>
              <option value="minimal">Minimal (line)</option>
              <option value="none">No Header</option>
            </select>
            <div className="ctrl-row-label">Logo Position</div>
            <select className="select-field" value={cfg.logoPosition} onChange={e => update({ logoPosition: e.target.value as any })}>
              <option value="header">In Header</option>
              <option value="above-qr">Above QR Code</option>
              <option value="none">Hidden</option>
            </select>
            <div className="ctrl-row-label">Background Pattern</div>
            <select className="select-field" value={cfg.pattern} onChange={e => update({ pattern: e.target.value as any })}>
              <option value="none">None</option>
              <option value="dots">Dots</option>
              <option value="lines">Lines</option>
              <option value="grid">Grid</option>
            </select>
            {cfg.pattern !== 'none' && (
              <SliderRow label="Pattern Opacity" value={Math.round(cfg.patternOpacity * 100)} min={1} max={20}
                onChange={v => update({ patternOpacity: v / 100 })} />
            )}
            <div className="toggle-row" style={{ marginTop: 10 }}>
              <span className="toggle-label">Drop Shadow</span>
              <button className={`toggle ${cfg.shadow ? 'on' : ''}`} onClick={() => update({ shadow: !cfg.shadow })} />
            </div>
          </Section>

          <Section title="Colors" icon={<Palette size={12} />} defaultOpen={false}>
            <ColorRow label="Card Background" value={cfg.bgColor} onChange={v => update({ bgColor: v })} />
            <ColorRow label="Header Background" value={cfg.headerColor} onChange={v => update({ headerColor: v })} />
            <ColorRow label="Header Text" value={cfg.headerTextColor} onChange={v => update({ headerTextColor: v })} />
            <ColorRow label="QR Foreground" value={cfg.qrFgColor} onChange={v => update({ qrFgColor: v })} />
            <ColorRow label="QR Background" value={cfg.qrBgColor} onChange={v => update({ qrBgColor: v })} />
            <ColorRow label="Student Name" value={cfg.nameColor} onChange={v => update({ nameColor: v })} />
            <ColorRow label="Class Text" value={cfg.classColor} onChange={v => update({ classColor: v })} />
            <ColorRow label="ID Text" value={cfg.idColor} onChange={v => update({ idColor: v })} />
            <ColorRow label="Card Border" value={cfg.borderColor} onChange={v => update({ borderColor: v })} />
          </Section>

          <Section title="Typography" icon={<Type size={12} />} defaultOpen={false}>
            <div className="ctrl-row-label">Font Family</div>
            <select className="select-field" value={cfg.fontFamily} onChange={e => update({ fontFamily: e.target.value })}>
              <option value="sans-serif">Sans Serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
              <option value="'Georgia', serif">Georgia</option>
              <option value="'Trebuchet MS', sans-serif">Trebuchet</option>
              <option value="'Courier New', monospace">Courier New</option>
            </select>
            <SliderRow label="Name Size" value={cfg.nameFontSize} min={10} max={22} onChange={v => update({ nameFontSize: v })} />
            <SliderRow label="Class Size" value={cfg.classFontSize} min={8} max={16} onChange={v => update({ classFontSize: v })} />
          </Section>

          <Section title="School Logo" icon={<ImageIcon size={12} />} defaultOpen={false}>
            <div className="upload-area">
              <input type="file" accept="image/*" onChange={handleLogoUpload} />
              <div className="upload-text">
                {logoPreview ? '✓ Logo uploaded — click to change' : 'Click to upload PNG/SVG/JPG'}
              </div>
            </div>
            <SliderRow label="Logo Size" value={cfg.logoSize} min={20} max={80} onChange={v => update({ logoSize: v })} />
          </Section>

          <Section title="Show / Hide" icon={<Layout size={12} />} defaultOpen={false}>
            {[
              ['showSchoolName', 'School Name'],
              ['showStudentName', 'Student Name'],
              ['showClass', 'Class'],
              ['showId', 'Short ID'],
              ['showFooter', 'Footer Text'],
            ].map(([key, label]) => (
              <div key={key} className="toggle-row">
                <span className="toggle-label">{label}</span>
                <button
                  className={`toggle ${cfg[key as keyof CardConfig] ? 'on' : ''}`}
                  onClick={() => update({ [key]: !cfg[key as keyof CardConfig] } as any)}
                />
              </div>
            ))}
            {cfg.showFooter && (
              <>
                <div className="ctrl-row-label">Footer Text</div>
                <input className="text-field" value={cfg.footerText}
                  onChange={e => update({ footerText: e.target.value })} placeholder="Footer text..." />
              </>
            )}
          </Section>
        </div>

        {/* Preview */}
        <div className="preview-area">
          <div className="preview-toolbar">
            <span className="toolbar-label">Card Preview — {cfg.cardWidth}×{cfg.cardHeight}px</span>
            <button className="action-btn action-btn-ghost" onClick={() => {
              setCfg(DEFAULT_CONFIG)
              saveConfig(schoolSlug, DEFAULT_CONFIG)
            }}>
              <RotateCcw size={13} />
              Reset
            </button>
            <button className="action-btn action-btn-ghost" onClick={handleDownload} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                : saveStatus === 'done' ? <Check size={13} /> : <Download size={13} />}
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'done' ? 'Saved!' : 'Save PNG'}
            </button>
            <button className="action-btn action-btn-ghost" onClick={handleShare} disabled={shareStatus === 'sharing'}>
              {shareStatus === 'sharing' ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                : (shareStatus === 'done' || shareStatus === 'copied') ? <Check size={13} /> : <Share2 size={13} />}
              {shareStatus === 'sharing' ? 'Sharing…' : shareStatus === 'copied' ? 'Copied!' : shareStatus === 'done' ? 'Shared!' : 'Share'}
            </button>
            <button className="action-btn action-btn-primary" onClick={handlePrint}>
              <Printer size={13} />
              Print
            </button>
          </div>

          <div className="preview-stage">
            <div className="qr-card-wrap" ref={cardRef} id="qr-card">
              <div
                className="qr-card"
                style={{
                  width: cfg.cardWidth,
                  minHeight: cfg.cardHeight,
                  backgroundColor: cfg.bgColor,
                  borderRadius: cfg.borderRadius,
                  border: cfg.borderWidth > 0 ? `${cfg.borderWidth}px solid ${cfg.borderColor}` : 'none',
                  boxShadow: cfg.shadow ? '0 8px 30px rgba(0,0,0,0.2)' : 'none',
                  fontFamily: cfg.fontFamily,
                  overflow: 'hidden',
                }}
              >
                {cfg.pattern !== 'none' && (
                  <div className="card-pattern" style={{ backgroundImage: patternSvg[cfg.pattern], opacity: cfg.patternOpacity }} />
                )}
                {cfg.headerStyle !== 'none' && (
                  <div className="card-header" style={{
                    background: headerBg,
                    borderBottom: cfg.headerStyle === 'minimal' ? `2px solid ${cfg.headerColor}` : 'none',
                    padding: cfg.headerStyle === 'minimal' ? '12px 16px' : '16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    {cfg.logoPosition === 'header' && (
                      <div style={{
                        width: cfg.logoSize, height: cfg.logoSize, borderRadius: '8px',
                        background: cfg.logoUrl ? 'transparent' : 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', flexShrink: 0,
                      }}>
                        {cfg.logoUrl
                          ? <img src={cfg.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                          : <svg width="20" height="20" viewBox="0 0 24 24" fill={cfg.headerTextColor} opacity={0.8}>
                            <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7 12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z"/>
                          </svg>
                        }
                      </div>
                    )}
                    {cfg.showSchoolName && (
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{
                          fontSize: 13, fontWeight: 700,
                          color: cfg.headerStyle === 'minimal' ? cfg.headerColor : cfg.headerTextColor,
                          lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{schoolName}</div>
                        <div style={{
                          fontSize: 9,
                          color: cfg.headerStyle === 'minimal' ? cfg.headerColor : cfg.headerTextColor,
                          opacity: 0.7, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 2,
                        }}>Student ID Card</div>
                      </div>
                    )}
                  </div>
                )}
                <div className="card-body" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  {cfg.logoPosition === 'above-qr' && (
                    <div style={{
                      width: cfg.logoSize + 10, height: cfg.logoSize + 10, borderRadius: '10px',
                      background: cfg.logoUrl ? 'transparent' : `${cfg.headerColor}15`,
                      border: `1px solid ${cfg.headerColor}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}>
                      {cfg.logoUrl
                        ? <img src={cfg.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                        : <svg width="24" height="24" viewBox="0 0 24 24" fill={cfg.headerColor}>
                          <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7 12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z"/>
                        </svg>
                      }
                    </div>
                  )}
                  <div style={{ padding: '10px', background: cfg.qrBgColor, borderRadius: 10, border: `1px solid ${cfg.borderColor}` }}>
                    <QRCodeCanvas value={student.qr_code} size={cfg.qrSize} bgColor={cfg.qrBgColor} fgColor={cfg.qrFgColor} level="H" />
                  </div>
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    {cfg.showStudentName && (
                      <div style={{ fontSize: cfg.nameFontSize, fontWeight: 700, color: cfg.nameColor, lineHeight: 1.2, marginBottom: 4 }}>
                        {student.full_name}
                      </div>
                    )}
                    {cfg.showClass && (
                      <div style={{ fontSize: cfg.classFontSize, color: cfg.classColor, marginBottom: cfg.showId ? 6 : 0 }}>
                        {student.class}
                      </div>
                    )}
                    {cfg.showId && (
                      <div style={{
                        fontSize: 10, color: cfg.idColor, fontFamily: 'monospace', letterSpacing: '1px',
                        background: `${cfg.headerColor}10`, padding: '3px 10px', borderRadius: 4,
                        display: 'inline-block', marginTop: 4,
                      }}>{shortId}</div>
                    )}
                  </div>
                  {cfg.showFooter && cfg.footerText && (
                    <div style={{
                      fontSize: 9, color: cfg.classColor, opacity: 0.6, textAlign: 'center',
                      borderTop: `1px solid ${cfg.borderColor}`, paddingTop: 10,
                      width: '100%', marginTop: 4, letterSpacing: '0.3px',
                    }}>{cfg.footerText}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(0,230,118,0.04)', border: '1px solid rgba(0,230,118,0.1)',
            borderRadius: 8, padding: '12px 16px', fontSize: 11,
            fontFamily: 'IBM Plex Mono, monospace', color: '#4ade80', lineHeight: 1.7,
          }}>
            <strong style={{ color: '#00e676' }}>Design auto-saved</strong> — your card style is remembered in this browser even after you navigate away or refresh.<br/>
            <strong style={{ color: '#00e676' }}>Print</strong> — sends to printer, best for ID cards on cardstock.<br/>
            <strong style={{ color: '#00e676' }}>Save PNG</strong> — downloads a high-res image (2×) you can print on any device.<br/>
            <strong style={{ color: '#00e676' }}>Share</strong> — sends via WhatsApp/Email on mobile, or copies image to clipboard on desktop.
          </div>
        </div>
      </div>

      <style>{`.spin { animation: spinAnim 0.8s linear infinite; } @keyframes spinAnim { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}