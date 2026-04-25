'use client'
import { useState } from 'react'
import { Student } from '@/lib/supabase/types'
import { QrCode, Search, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function StudentList({
  students: initial,
  schoolSlug,
  schoolId,
}: {
  students: Student[]
  schoolSlug: string
  schoolId: string
}) {
  const [students, setStudents] = useState(initial)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const classes = ['all', ...Array.from(new Set(initial.map(s => s.class))).sort()]

  const filtered = students.filter(s => {
    const matchSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.class.toLowerCase().includes(search.toLowerCase())
    const matchClass = classFilter === 'all' || s.class === classFilter
    return matchSearch && matchClass
  })

  async function callManage(student: Student, action: 'suspend' | 'activate' | 'delete') {
    setBusy(student.id)
    const res = await fetch('/api/manage-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'student', id: student.id, action, school_id: schoolId }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { toast.error(data.message ?? 'Failed'); return }

    if (action === 'delete') {
      setStudents(prev => prev.filter(s => s.id !== student.id))
      toast.success(`${student.full_name} removed`)
    } else {
      setStudents(prev => prev.map(s =>
        s.id === student.id ? { ...s, is_active: action === 'activate' } : s
      ))
      toast.success(action === 'activate' ? 'Student activated' : 'Student suspended')
    }
    setConfirmDelete(null)
  }

  return (
    <div>
      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-red-500/20">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={22} className="text-red-400" />
            </div>
            <h2 className="text-white font-bold text-center mb-1">Remove Student?</h2>
            <p className="text-gray-400 text-xs text-center mb-5">
              <strong className="text-white">{confirmDelete.full_name}</strong> will be deactivated.
              Their attendance history is preserved. They can be re-activated later.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-gray-800 text-white py-2.5 rounded-lg text-sm hover:bg-gray-700">Cancel</button>
              <button
                onClick={() => callManage(confirmDelete, 'delete')}
                disabled={busy === confirmDelete.id}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-3 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full bg-gray-900 text-white pl-9 pr-4 py-2.5 rounded-lg border border-gray-800 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="bg-gray-900 text-white px-3 py-2.5 rounded-lg border border-gray-800 text-sm focus:outline-none"
        >
          {classes.map(c => <option key={c} value={c}>{c === 'all' ? 'All Classes' : c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Name</th>
              <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Class</th>
              <th className="text-left text-gray-400 text-xs font-medium px-4 py-3 hidden md:table-cell">Parent Phone</th>
              <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">QR</th>
              <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.map(student => (
              <tr key={student.id} className={`hover:bg-gray-800/50 ${!student.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="text-white text-sm font-medium">{student.full_name}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-full">
                    {student.class}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="text-gray-400 text-sm">{student.parent_phone}</p>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/${schoolSlug}/admin/students/${student.id}/qr`}
                    className="flex items-center gap-1.5 text-green-400 hover:text-green-300 text-sm"
                  >
                    <QrCode size={14} />
                    View
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/* Suspend / activate */}
                    <button
                      onClick={() => callManage(student, student.is_active ? 'suspend' : 'activate')}
                      disabled={busy === student.id}
                      className={`${student.is_active ? 'text-green-400 hover:text-yellow-400' : 'text-gray-600 hover:text-green-400'} transition-colors disabled:opacity-40`}
                      title={student.is_active ? 'Suspend student' : 'Activate student'}
                    >
                      {student.is_active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => setConfirmDelete(student)}
                      disabled={busy === student.id}
                      className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                      title="Remove student"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No students found</p>
        )}
      </div>
    </div>
  )
}
