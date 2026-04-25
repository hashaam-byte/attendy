import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import StudentList from './StudentList'
import { notFound } from 'next/navigation'

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ school_slug: string }>
}) {
  const { school_slug } = await params
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('id, name')
    .eq('slug', school_slug)
    .single()

  if (!school) notFound()

  // Include ALL students (active + inactive) so admin can re-activate
  const { data: students } = await supabase
    .from('students')
    .select('*')
    .eq('school_id', school.id)
    .order('is_active', { ascending: false }) // active first
    .order('class', { ascending: true })
    .order('full_name', { ascending: true })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Students</h1>
          <p className="text-gray-400 text-sm">
            {students?.filter(s => s.is_active).length ?? 0} active
            {(students?.filter(s => !s.is_active).length ?? 0) > 0 &&
              ` · ${students?.filter(s => !s.is_active).length} inactive`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/${school_slug}/admin/students/bulk`}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700"
          >
            <Users size={16} />
            Bulk Import
          </Link>
          <Link
            href={`/${school_slug}/admin/students/register`}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Student
          </Link>
        </div>
      </div>
      <StudentList
        students={students ?? []}
        schoolSlug={school_slug}
        schoolId={school.id}
      />
    </div>
  )
}
