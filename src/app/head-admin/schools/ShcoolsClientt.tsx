'use client'
import { useState } from 'react'
import { Plus, Search, CheckCircle, XCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface School {
  id: string
  name: string
  slug: string
  plan: string
  is_active: boolean
  plan_expires_at: string | null
  max_students: number
  max_teachers: number
  max_parents: number
  created_at: string
}

const PLAN_LIMITS: Record<string, { max_students: number; max_teachers: number; max_parents: number }> = {
  free:     { max_students: 50,   max_teachers: 3,  max_parents: 50  },
  basic:    { max_students: 200,  max_teachers: 10, max_parents: 200 },
  standard: { max_students: 500,  max_teachers: 30, max_parents: 500 },
  pro:      { max_students: 9999, max_teachers: 99, max_parents: 9999 },
}

export default function SchoolsClient({ schools: initial }: { schools: School[] }) {
  const [schools, setSchools] = useState(initial)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    plan: 'basic',
    plan_expires_at: '',
    admin_email: '',
    admin_name: '',
    admin_password: '',
  })

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  )

  function slugify(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  async function createSchool() {
    if (!form.name || !form.slug || !form.admin_email || !form.admin_name || !form.admin_password) {
      toast.error('All fields are required')
      return
    }
    if (form.slug !== slugify(form.slug)) {
      toast.error('Slug must be lowercase letters, numbers, and hyphens only')
      return
    }
    setCreating(true)

    const res = await fetch('/api/head-admin/schools/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        ...PLAN_LIMITS[form.plan],
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.message ?? 'Failed to create school')
      setCreating(false)
      return
    }

    toast.success(`School created! Login at /${form.slug}/login`)
    setSchools(prev => [data.school, ...prev])
    setShowCreate(false)
    setForm({ name: '', slug: '', plan: 'basic', plan_expires_at: '', admin_email: '', admin_name: '', admin_password: '' })
    setCreating(false)
  }

  async function toggleActive(school: School) {
    const res = await fetch(`/api/head-admin/schools/${school.id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !school.is_active }),
    })

    if (res.ok) {
      setSchools(prev => prev.map(s =>
        s.id === school.id ? { ...s, is_active: !s.is_active } : s
      ))
      toast.success(`School ${!school.is_active ? 'activated' : 'suspended'}`)
    } else {
      toast.error('Failed to update school status')
    }
  }

  const planColors: Record<string, string> = {
    free: 'bg-gray-500/10 text-gray-400',
    basic: 'bg-blue-500/10 text-blue-400',
    standard: 'bg-green-500/10 text-green-400',
    pro: 'bg-purple-500/10 text-purple-400',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Schools</h1>
          <p className="text-gray-400 text-sm">{schools.length} registered</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          Add School
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-3 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search schools..."
          className="w-full bg-gray-900 text-white pl-9 pr-4 py-2.5 rounded-lg border border-gray-800 text-sm focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Create school modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800 my-4">
            <h2 className="text-white font-bold text-lg mb-5">Create New School</h2>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs block mb-1">School Name *</label>
                <input
                  value={form.name}
                  onChange={e => {
                    const name = e.target.value
                    setForm(p => ({ ...p, name, slug: slugify(name) }))
                  }}
                  placeholder="e.g. Kings College Lagos"
                  className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">School Slug (URL) *</label>
                <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 focus-within:border-purple-500">
                  <span className="text-gray-500 text-sm">attendy.ng/</span>
                  <input
                    value={form.slug}
                    onChange={e => setForm(p => ({ ...p, slug: slugify(e.target.value) }))}
                    placeholder="kings-college-lagos"
                    className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                  />
                </div>
                <p className="text-gray-600 text-xs mt-1">Lowercase, hyphens only. Cannot be changed later.</p>
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">Plan *</label>
                <select
                  value={form.plan}
                  onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
                  className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none"
                >
                  <option value="free">Free (50 students)</option>
                  <option value="basic">Basic — ₦120k/yr (200 students)</option>
                  <option value="standard">Standard — ₦200k/yr (500 students)</option>
                  <option value="pro">Pro — ₦350k/yr (unlimited)</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">Plan Expires</label>
                <input
                  type="date"
                  value={form.plan_expires_at}
                  onChange={e => setForm(p => ({ ...p, plan_expires_at: e.target.value }))}
                  className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none"
                />
              </div>

              <div className="border-t border-gray-800 pt-3">
                <p className="text-gray-400 text-xs mb-3 font-medium">Admin Account (for this school)</p>
                <div className="space-y-3">
                  <input
                    value={form.admin_name}
                    onChange={e => setForm(p => ({ ...p, admin_name: e.target.value }))}
                    placeholder="Admin Full Name *"
                    className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none"
                  />
                  <input
                    type="email"
                    value={form.admin_email}
                    onChange={e => setForm(p => ({ ...p, admin_email: e.target.value }))}
                    placeholder="Admin Email *"
                    className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none"
                  />
                  <input
                    type="password"
                    value={form.admin_password}
                    onChange={e => setForm(p => ({ ...p, admin_password: e.target.value }))}
                    placeholder="Initial Password *"
                    className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-gray-800 text-white py-2.5 rounded-lg text-sm hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={createSchool}
                disabled={creating}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold"
              >
                {creating ? 'Creating...' : 'Create School'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schools list */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">School</th>
              <th className="text-left text-gray-400 text-xs font-medium px-4 py-3 hidden md:table-cell">Slug</th>
              <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Plan</th>
              <th className="text-left text-gray-400 text-xs font-medium px-4 py-3 hidden md:table-cell">Expires</th>
              <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Status</th>
              <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.map(school => {
              const isExpired = school.plan_expires_at
                ? new Date(school.plan_expires_at) < new Date()
                : false
              return (
                <tr key={school.id} className="hover:bg-gray-800/40">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium">{school.name}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-gray-400 text-xs font-mono">/{school.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${planColors[school.plan] ?? planColors.free}`}>
                      {school.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {school.plan_expires_at ? (
                      <span className={`text-xs ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
                        {new Date(school.plan_expires_at).toLocaleDateString('en-NG')}
                        {isExpired && ' ⚠'}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${school.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {school.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/head-admin/schools/${school.id}`}
                        className="text-purple-400 hover:text-purple-300"
                        title="Manage"
                      >
                        <Settings size={15} />
                      </Link>
                      <button
                        onClick={() => toggleActive(school)}
                        className={`${school.is_active ? 'text-green-400 hover:text-red-400' : 'text-gray-500 hover:text-green-400'} transition-colors`}
                        title={school.is_active ? 'Suspend' : 'Activate'}
                      >
                        {school.is_active ? <CheckCircle size={15} /> : <XCircle size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-10">No schools yet</p>
        )}
      </div>
    </div>
  )
}