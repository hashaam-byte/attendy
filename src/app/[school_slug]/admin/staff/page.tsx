'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  UserPlus,
  Loader2,
  CheckCircle,
  XCircle,
  MailCheck,
  RefreshCw,
} from 'lucide-react'

type Role = 'teacher' | 'gateman'

interface Staff {
  id: string
  full_name: string
  phone: string | null
  role: string
  is_active: boolean
  created_at: string
  user_id: string
}

export default function StaffPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const supabase = createClient()

  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'teacher' as Role,
  })
  const [inviting, setInviting] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('slug', school_slug)
      .single()

    if (!school) {
      setLoading(false)
      return
    }

    setSchoolId(school.id)

    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, phone, role, is_active, created_at, user_id')
      .eq('school_id', school.id)
      .neq('role', 'parent')
      .neq('role', 'admin')
      .order('created_at', { ascending: false })

    setStaff(data ?? [])
    setLoading(false)
  }

  async function toggleActive(profileId: string, current: boolean) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !current })
      .eq('id', profileId)

    if (error) {
      toast.error('Failed to update staff status')
    } else {
      setStaff((prev) =>
        prev.map((s) =>
          s.id === profileId ? { ...s, is_active: !current } : s
        )
      )
      toast.success(current ? 'Staff deactivated' : 'Staff activated')
    }
  }

  async function sendInvite() {
    if (!inviteForm.full_name || !inviteForm.email) {
      toast.error('Name and email are required')
      return
    }
    if (!schoolId) return
    setInviting(true)

    const res = await fetch('/api/invite-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...inviteForm, school_id: schoolId }),
    })

    const data = await res.json()

    if (res.ok) {
      toast.success(
        `✉️ Invite sent to ${inviteForm.email}! They'll receive an email to set their password.`,
        { duration: 6000 }
      )
      setShowInvite(false)
      setInviteForm({ full_name: '', email: '', phone: '', role: 'teacher' })
      await load() // Refresh to show new staff member
    } else {
      toast.error(data.message ?? 'Failed to invite staff')
    }
    setInviting(false)
  }

  async function resendInvite(staffMember: Staff) {
    setResendingId(staffMember.id)
    // We call the API with the same data to re-invite
    // But first get the email from auth - we'll just show a message
    toast.info(
      'To resend an invite, delete this staff member and invite them again with the same email.',
      { duration: 5000 }
    )
    setResendingId(null)
  }

  const roleColors: Record<string, string> = {
    teacher: 'bg-blue-500/10 text-blue-400',
    gateman: 'bg-orange-500/10 text-orange-400',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Staff</h1>
          <p className="text-gray-400 text-sm">{staff.length} members</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <UserPlus size={16} />
          Invite Staff
        </button>
      </div>

      {/* How invite works — info box */}
      <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 mb-6 flex gap-3">
        <MailCheck size={18} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-white text-sm font-medium">How staff login works</p>
          <p className="text-gray-400 text-xs mt-1 leading-relaxed">
            When you invite a staff member, they receive an email with a link to
            set their own password. They then log in at{' '}
            <span className="text-green-400 font-mono text-xs">
              attendy.ng/{school_slug}/login
            </span>{' '}
            using their email and the password they set. If they don't receive
            the email, check their spam folder or resend the invite.
          </p>
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
            <h2 className="text-white font-bold mb-1">Invite Staff Member</h2>
            <p className="text-gray-400 text-xs mb-4">
              They'll receive an email to set their own password.
            </p>
            <div className="space-y-3">
              <input
                value={inviteForm.full_name}
                onChange={(e) =>
                  setInviteForm((p) => ({ ...p, full_name: e.target.value }))
                }
                placeholder="Full Name *"
                className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none focus:border-green-500"
              />
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="Email Address *"
                className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none focus:border-green-500"
              />
              <input
                value={inviteForm.phone}
                onChange={(e) =>
                  setInviteForm((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="Phone Number (optional)"
                className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none focus:border-green-500"
              />
              <select
                value={inviteForm.role}
                onChange={(e) =>
                  setInviteForm((p) => ({
                    ...p,
                    role: e.target.value as Role,
                  }))
                }
                className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none"
              >
                <option value="teacher">Teacher</option>
                <option value="gateman">Gateman</option>
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 bg-gray-800 text-white py-2.5 rounded-lg text-sm hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={sendInvite}
                disabled={inviting}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
              >
                {inviting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <MailCheck size={16} />
                )}
                {inviting ? 'Sending…' : 'Send Invite Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-500" />
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
          {staff.map((member) => (
            <div key={member.id} className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {member.full_name}
                </p>
                <p className="text-gray-500 text-xs">
                  {member.phone ?? 'No phone'}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  roleColors[member.role] ?? 'bg-gray-500/10 text-gray-400'
                }`}
              >
                {member.role}
              </span>
              <button
                onClick={() => toggleActive(member.id, member.is_active)}
                className={`${
                  member.is_active ? 'text-green-400' : 'text-gray-600'
                } hover:opacity-70 transition-opacity`}
                title={member.is_active ? 'Deactivate' : 'Activate'}
              >
                {member.is_active ? (
                  <CheckCircle size={18} />
                ) : (
                  <XCircle size={18} />
                )}
              </button>
            </div>
          ))}
          {staff.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm">No staff added yet</p>
              <p className="text-gray-600 text-xs mt-1">
                Click &quot;Invite Staff&quot; to add teachers and gatemen
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}