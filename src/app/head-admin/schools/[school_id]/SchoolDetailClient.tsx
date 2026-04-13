'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const PLAN_LIMITS: Record<string, { max_students: number; max_teachers: number; max_parents: number }> = {
  free:     { max_students: 50,   max_teachers: 3,  max_parents: 50  },
  basic:    { max_students: 200,  max_teachers: 10, max_parents: 200 },
  standard: { max_students: 500,  max_teachers: 30, max_parents: 500 },
  pro:      { max_students: 9999, max_teachers: 99, max_parents: 9999 },
}

export default function SchoolDetailClient({ school, studentCount, staffCount, logs }: any) {
  const router = useRouter()
  const [form, setForm] = useState({
    plan: school.plan,
    plan_expires_at: school.plan_expires_at
      ? new Date(school.plan_expires_at).toISOString().split('T')[0]
      : '',
    is_active: school.is_active,
    max_students: school.max_students,
    max_teachers: school.max_teachers,
    max_parents: school.max_parents,
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/head-admin/schools/${school.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      toast.success('School updated')
      router.refresh()
    } else {
      const d = await res.json()
      toast.error(d.message ?? 'Failed to update')
    }
    setSaving(false)
  }

  const logColors: Record<string, string> = {
    activated: 'text-green-400',
    suspended: 'text-red-400',
    deactivated: 'text-red-400',
    plan_changed: 'text-blue-400',
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/head-admin/schools" className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-white text-2xl font-bold">{school.name}</h1>
          <p className="text-gray-400 text-sm font-mono">/{school.slug}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-2xl font-bold text-white">{studentCount}</p>
          <p className="text-gray-400 text-sm">Students ({form.max_students} max)</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-2xl font-bold text-white">{staffCount}</p>
          <p className="text-gray-400 text-sm">Staff ({form.max_teachers} max)</p>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6 space-y-4">
        <h2 className="text-white font-semibold">Subscription Settings</h2>

        <div>
          <label className="text-gray-400 text-xs block mb-1.5">Plan</label>
          <select
            value={form.plan}
            onChange={e => {
              const plan = e.target.value
              setForm(p => ({ ...p, plan, ...PLAN_LIMITS[plan] }))
            }}
            className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none"
          >
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="pro">Pro</option>
          </select>
        </div>

        <div>
          <label className="text-gray-400 text-xs block mb-1.5">Plan Expires</label>
          <input
            type="date"
            value={form.plan_expires_at}
            onChange={e => setForm(p => ({ ...p, plan_expires_at: e.target.value }))}
            className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-white text-sm">Account Status</p>
            <p className="text-gray-500 text-xs">Suspending prevents all logins for this school</p>
          </div>
          <div
            onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
            className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${form.is_active ? 'bg-green-500' : 'bg-red-500/50'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.is_active ? 'translate-x-7' : 'translate-x-1'}`} />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white p-3 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Subscription log */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold text-sm">Activity Log</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {logs.length > 0 ? logs.map((log: any) => (
            <div key={log.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${logColors[log.action] ?? 'text-gray-400'}`}>
                  {log.action.replace('_', ' ').toUpperCase()}
                </p>
                <p className="text-gray-500 text-xs">{log.note}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs">{new Date(log.created_at).toLocaleDateString('en-NG')}</p>
                <p className="text-gray-600 text-xs">{log.performed_by}</p>
              </div>
            </div>
          )) : (
            <p className="text-gray-500 text-sm text-center py-6">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  )
}