'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle, Clock, AlertCircle, LogOut, Shield } from 'lucide-react'
import dynamic from 'next/dynamic'

const QRScanner = dynamic(() => import('@/components/scanner/QRScanner'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-sm mx-auto h-64 bg-gray-800 rounded-xl animate-pulse" />
  ),
})

interface ScanResult {
  status: 'success' | 'late' | 'duplicate' | 'error'
  studentName: string
  class: string
  time: string
  message?: string
}

interface ResolvedUser {
  userId: string
  schoolId: string
  fullName: string
  role: string
}

export default function GatemanScanPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const supabase = createClient()
  const router = useRouter()

  const [processing, setProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [resolvedUser, setResolvedUser] = useState<ResolvedUser | null>(null)

  // Resolve user once and cache
  async function getResolvedUser(): Promise<ResolvedUser | null> {
    if (resolvedUser) return resolvedUser

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('school_id, full_name, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) return null

    const resolved: ResolvedUser = {
      userId: user.id,
      schoolId: profile.school_id,
      fullName: profile.full_name,
      role: profile.role,
    }
    setResolvedUser(resolved)
    return resolved
  }

  async function handleScan(qrCode: string) {
    if (processing) return
    setProcessing(true)

    const user = await getResolvedUser()
    if (!user) {
      toast.error('Session expired. Please log in again.')
      setProcessing(false)
      return
    }

    // CRITICAL: enforce school boundary on student lookup
    const { data: student } = await supabase
      .from('students')
      .select('id, full_name, class')
      .eq('qr_code', qrCode)
      .eq('school_id', user.schoolId)
      .single()

    if (!student) {
      toast.error('Student not found')
      setProcessing(false)
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('attendance_logs')
      .select('id, scanned_at')
      .eq('student_id', student.id)
      .eq('school_id', user.schoolId)
      .eq('scan_type', 'entry')
      .gte('scanned_at', `${today}T00:00:00`)
      .maybeSingle()

    const time = new Date().toLocaleTimeString('en-NG', {
      hour: '2-digit', minute: '2-digit'
    })

    if (existing) {
      const existingTime = new Date(existing.scanned_at).toLocaleTimeString('en-NG', {
        hour: '2-digit', minute: '2-digit'
      })
      setLastResult({
        status: 'duplicate',
        studentName: student.full_name,
        class: student.class,
        time,
        message: `Already scanned today at ${existingTime}`,
      })
      setProcessing(false)
      return
    }

    // Late check
    const [overrideRes, settingsRes] = await Promise.all([
      supabase
        .from('late_cutoff_overrides')
        .select('cutoff_time')
        .eq('school_id', user.schoolId)
        .eq('override_date', today)
        .maybeSingle(),
      supabase
        .from('school_settings')
        .select('late_cutoff')
        .eq('school_id', user.schoolId)
        .single(),
    ])

    const cutoffTime = overrideRes.data?.cutoff_time ?? settingsRes.data?.late_cutoff ?? '08:00'
    const now = new Date()
    const [ch, cm] = cutoffTime.split(':').map(Number)
    const cutoff = new Date()
    cutoff.setHours(ch, cm, 0, 0)
    const isLate = now > cutoff

    const { error } = await supabase.from('attendance_logs').insert({
      school_id: user.schoolId,
      student_id: student.id,
      scan_type: 'entry',
      is_late: isLate,
      scanned_by: user.userId,
      scanned_by_role: 'gateman',
      scanned_by_name: user.fullName,
    })

    if (error) {
      setLastResult({ status: 'error', studentName: student.full_name, class: student.class, time, message: error.message })
    } else {
      setLastResult({ status: isLate ? 'late' : 'success', studentName: student.full_name, class: student.class, time })
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id, isLate, reason: '', time }),
      }).catch(() => {})
    }

    setProcessing(false)
  }

  const resultStyles = {
    success: { bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle, color: 'text-green-400', label: 'On Time' },
    late: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: Clock, color: 'text-yellow-400', label: 'Late' },
    duplicate: { bg: 'bg-blue-500/10 border-blue-500/30', icon: AlertCircle, color: 'text-blue-400', label: 'Already Scanned' },
    error: { bg: 'bg-red-500/10 border-red-500/30', icon: AlertCircle, color: 'text-red-400', label: 'Error' },
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-green-500" />
            <div>
              <h1 className="text-white text-xl font-bold">Gate Scanner</h1>
              <p className="text-gray-400 text-xs capitalize">{school_slug.replace(/-/g, ' ')}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push(`/${school_slug}/login`)
            }}
            className="text-gray-500 hover:text-red-400"
          >
            <LogOut size={20} />
          </button>
        </div>

        <QRScanner onScan={handleScan} active={!processing} />

        {processing && (
          <p className="text-center text-gray-400 text-sm mt-4 animate-pulse">Processing...</p>
        )}

        {lastResult && (() => {
          const style = resultStyles[lastResult.status]
          const Icon = style.icon
          return (
            <div className={`mt-6 rounded-xl border p-4 ${style.bg}`}>
              <div className="flex items-center gap-3">
                <Icon size={24} className={style.color} />
                <div>
                  <p className="text-white font-semibold">{lastResult.studentName}</p>
                  <p className="text-gray-400 text-sm">{lastResult.class}</p>
                </div>
                <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${style.color} bg-white/5`}>
                  {style.label}
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                {lastResult.message ?? `Scanned at ${lastResult.time}`}
              </p>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
