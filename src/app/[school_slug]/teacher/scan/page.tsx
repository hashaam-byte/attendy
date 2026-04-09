'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle, Clock, AlertCircle, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// QR scanner uses browser APIs, must be client-only
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

export default function TeacherScanPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const supabase = createClient()
  const router = useRouter()

  const [scanning, setScanning] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [lateReason, setLateReason] = useState('')
  const [showLateReason, setShowLateReason] = useState(false)
  const [pendingScan, setPendingScan] = useState<string | null>(null)

  async function handleScan(qrCode: string) {
    if (processing) return
    setProcessing(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('school_id, full_name, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      setProcessing(false)
      return
    }

    // Find student by QR code
    const { data: student } = await supabase
      .from('students')
      .select('id, full_name, class, school_id')
      .eq('qr_code', qrCode)
      .eq('school_id', profile.school_id)
      .single()

    if (!student) {
      toast.error('Student not found for this QR code')
      setProcessing(false)
      return
    }

    // Check for duplicate entry scan today
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('attendance_logs')
      .select('id, scanned_at')
      .eq('student_id', student.id)
      .eq('scan_type', 'entry')
      .gte('scanned_at', `${today}T00:00:00`)
      .single()

    if (existing) {
      const time = new Date(existing.scanned_at).toLocaleTimeString('en-NG', {
        hour: '2-digit', minute: '2-digit'
      })
      setLastResult({
        status: 'duplicate',
        studentName: student.full_name,
        class: student.class,
        time,
        message: `Already scanned today at ${time}`
      })
      setProcessing(false)
      return
    }

    // Get late cutoff — check override first, then default setting
    const todayDate = new Date().toISOString().split('T')[0]
    const { data: override } = await supabase
      .from('late_cutoff_overrides')
      .select('cutoff_time')
      .eq('school_id', profile.school_id)
      .eq('override_date', todayDate)
      .single()

    const { data: settings } = await supabase
      .from('school_settings')
      .select('late_cutoff')
      .eq('school_id', profile.school_id)
      .single()

    const cutoffTime = override?.cutoff_time ?? settings?.late_cutoff ?? '08:00'
    const now = new Date()
    const [ch, cm] = cutoffTime.split(':').map(Number)
    const cutoff = new Date()
    cutoff.setHours(ch, cm, 0, 0)
    const isLate = now > cutoff

    // If late, pause for reason input
    if (isLate) {
      setPendingScan(qrCode)
      setShowLateReason(true)
      setProcessing(false)
      return
    }

    await recordAttendance(student, profile, false, '')
  }

  async function recordAttendance(
    student: any,
    profile: any,
    isLate: boolean,
    reason: string
  ) {
    const { error } = await supabase.from('attendance_logs').insert({
      school_id: profile.school_id,
      student_id: student.id,
      scan_type: 'entry',
      is_late: isLate,
      late_reason: reason || null,
      scanned_by: (await supabase.auth.getUser()).data.user?.id,
      scanned_by_role: profile.role,
      scanned_by_name: profile.full_name,
    })

    const time = new Date().toLocaleTimeString('en-NG', {
      hour: '2-digit', minute: '2-digit'
    })

    if (error) {
      setLastResult({
        status: 'error',
        studentName: student.full_name,
        class: student.class,
        time,
        message: error.message,
      })
    } else {
      setLastResult({
        status: isLate ? 'late' : 'success',
        studentName: student.full_name,
        class: student.class,
        time,
      })

      // Trigger SMS via API route (Phase 3)
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          isLate,
          reason,
          time,
        }),
      }).catch(() => {}) // Fire and forget
    }

    setProcessing(false)
    setShowLateReason(false)
    setPendingScan(null)
    setLateReason('')
  }

  async function submitLateReason() {
    if (!pendingScan) return
    setProcessing(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('school_id, full_name, role')
      .eq('user_id', user!.id)
      .single()

    const { data: student } = await supabase
      .from('students')
      .select('id, full_name, class, school_id')
      .eq('qr_code', pendingScan)
      .eq('school_id', profile!.school_id)
      .single()

    if (student && profile) {
      await recordAttendance(student, profile, true, lateReason)
    }
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-xl font-bold">Scan QR Code</h1>
            <p className="text-gray-400 text-xs capitalize">
              {school_slug.replace(/-/g, ' ')}
            </p>
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

        {/* Late reason modal */}
        {showLateReason && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-yellow-500/30">
              <h2 className="text-white font-bold mb-1">Student is Late</h2>
              <p className="text-gray-400 text-sm mb-4">
                Add a reason (optional) before recording attendance
              </p>
              <textarea
                value={lateReason}
                onChange={e => setLateReason(e.target.value)}
                placeholder="e.g. Traffic, family emergency..."
                rows={3}
                className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm resize-none focus:outline-none focus:border-yellow-500 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLateReason(false)
                    setPendingScan(null)
                    setProcessing(false)
                  }}
                  className="flex-1 bg-gray-800 text-white py-2 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={submitLateReason}
                  disabled={processing}
                  className="flex-1 bg-yellow-500 text-black py-2 rounded-lg text-sm font-semibold"
                >
                  {processing ? 'Saving...' : 'Record Late'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scanner */}
        <div className="mb-6">
          <QRScanner
            onScan={handleScan}
            onError={err => toast.error('Camera error: ' + err)}
            active={scanning && !showLateReason}
          />
          {processing && (
            <p className="text-center text-gray-400 text-sm mt-3 animate-pulse">
              Processing scan...
            </p>
          )}
        </div>

        {/* Last scan result */}
        {lastResult && (() => {
          const style = resultStyles[lastResult.status]
          const Icon = style.icon
          return (
            <div className={`rounded-xl border p-4 ${style.bg}`}>
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