'use client'
import { useState } from 'react'
import { Student } from '@/lib/supabase/types'
import { QrCode, Search } from 'lucide-react'
import Link from 'next/link'

export default function StudentList({
  students,
  schoolSlug,
}: {
  students: Student[]
  schoolSlug: string
}) {
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')

  const classes = ['all', ...Array.from(new Set(students.map(s => s.class))).sort()]

  const filtered = students.filter(s => {
    const matchSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.class.toLowerCase().includes(search.toLowerCase())
    const matchClass = classFilter === 'all' || s.class === classFilter
    return matchSearch && matchClass
  })

  return (
    <div>
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
          {classes.map(c => (
            <option key={c} value={c}>{c === 'all' ? 'All Classes' : c}</option>
          ))}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.map(student => (
              <tr key={student.id} className="hover:bg-gray-800/50">
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