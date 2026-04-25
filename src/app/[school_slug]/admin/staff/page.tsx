'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  UserPlus, Loader2, CheckCircle, XCircle, ShieldCheck,
  Copy, Check, Trash2, AlertTriangle,
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
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', phone: '', role: 'teacher' as Role })
  const [inviting, setInviting] = useState(false)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<{ email: string; verifyUrl: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Staff | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: school } = await supabase.from('schools').select('id').eq('slug', school_slug).single()
    if (!school) { setLoading(false); return }
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

  async function callManageUser(member: Staff, action: 'suspend' | 'activate' | 'delete') {
    if (!schoolId) return
    const res = await fetch('/api/manage-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'staff', id: member.id, action, school_id: schoolId }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.message ?? 'Failed'); return }

    if (action === 'delete') {
      setStaff(prev => prev.filter(s => s.id !== member.id))
      toast.success(`${member.full_name} removed`)
    } else {
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, is_active: action === 'activate' } : s))
      toast.success(action === 'activate' ? 'Staff activated' : 'Staff suspended & signed out')
    }
    setConfirmDelete(null)
  }

  async function sendInvite() {
    if (!inviteForm.full_name || !inviteForm.email) { toast.error('Name and email are required'); return }
    if (!schoolId) return
    setInviting(true)
    const res = await fetch('/api/invite-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...inviteForm, school_id: schoolId }),
    })
    const data = await res.json()
    if (res.ok) {
      setInviteSuccess({ email: inviteForm.email, verifyUrl: data.verify_url ?? `${window.location.origin}/${school_slug}/auth/verify-otp` })
      setInviteForm({ full_name: '', email: '', phone: '', role: 'teacher' })
      await load()
    } else {
      toast.error(data.message ?? 'Failed to invite staff')
    }
    setInviting(false)
  }

  function copyLink() {
    if (inviteSuccess?.verifyUrl) {
      navigator.clipboard.writeText(inviteSuccess.verifyUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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
          onClick={() => { setShowInvite(true); setInviteSuccess(null) }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <UserPlus size={16} />
          Invite Staff
        </button>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
            {inviteSuccess ? (
              <div>
                <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={22} className="text-green-400" />
                </div>
                <h2 className="text-white font-bold text-center mb-1">Invite sent!</h2>
                <p className="text-gray-400 text-xs text-center mb-5">
                  A 6-digit verification code was emailed to <strong className="text-white">{inviteSuccess.email}</strong>.
                </p>
                <div className="bg-gray-800 rounded-lg p-3 mb-4">
                  <p className="text-gray-400 text-xs mb-2">Share this link:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-green-400 text-xs flex-1 truncate font-mono">{inviteSuccess.verifyUrl}</code>
                    <button onClick={copyLink} className="text-gray-400 hover:text-white flex-shrink-0">
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <button onClick={() => { setShowInvite(false); setInviteSuccess(null) }} className="w-full bg-gray-800 text-white py-2.5 rounded-lg text-sm hover:bg-gray-700">Close</button>
              </div>
            ) : (
              <>
                <h2 className="text-white font-bold mb-1">Invite Staff Member</h2>
                <p className="text-gray-400 text-xs mb-4">They'll receive a 6-digit code by email.</p>
                <div className="space-y-3">
                  <input value={inviteForm.full_name} onChange={e => setInviteForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Full Name *" className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none focus:border-green-500" />
                  <input type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="Email Address *" className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none focus:border-green-500" />
                  <input value={inviteForm.phone} onChange={e => setInviteForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone Number (optional)" className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none focus:border-green-500" />
                  <select value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value as Role }))} className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none">
                    <option value="teacher">Teacher</option>
                    <option value="gateman">Gateman</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowInvite(false)} className="flex-1 bg-gray-800 text-white py-2.5 rounded-lg text-sm hover:bg-gray-700">Cancel</button>
                  <button onClick={sendInvite} disabled={inviting} className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50">
                    {inviting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    {inviting ? 'Sending…' : 'Send Invite'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-red-500/20">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={22} className="text-red-400" />
            </div>
            <h2 className="text-white font-bold text-center mb-1">Remove Staff Member?</h2>
            <p className="text-gray-400 text-xs text-center mb-5">
              <strong className="text-white">{confirmDelete.full_name}</strong> will be deactivated and signed out immediately. They cannot log in again.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-gray-800 text-white py-2.5 rounded-lg text-sm hover:bg-gray-700">Cancel</button>
              <button onClick={() => callManageUser(confirmDelete, 'delete')} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-500" /></div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
          {staff.map(member => (
            <div key={member.id} className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{member.full_name}</p>
                <p className="text-gray-500 text-xs">{member.phone ?? 'No phone'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[member.role] ?? 'bg-gray-500/10 text-gray-400'}`}>
                {member.role}
              </span>
              {/* Suspend / Activate toggle */}
              <button
                onClick={() => callManageUser(member, member.is_active ? 'suspend' : 'activate')}
                className={`${member.is_active ? 'text-green-400 hover:text-yellow-400' : 'text-gray-600 hover:text-green-400'} transition-colors`}
                title={member.is_active ? 'Suspend' : 'Activate'}
              >
                {member.is_active ? <CheckCircle size={18} /> : <XCircle size={18} />}
              </button>
              {/* Delete */}
              <button
                onClick={() => setConfirmDelete(member)}
                className="text-gray-600 hover:text-red-400 transition-colors"
                title="Remove staff"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {staff.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm">No staff added yet</p>
              <p className="text-gray-600 text-xs mt-1">Click "Invite Staff" to add teachers and gatemen</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
