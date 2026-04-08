import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import StudentList from './StudentList'

export default async function StudentsPage({
  params,
}: {
  params: { school_slug: string }
}) {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('students')
    .select('*')
    .order('class', { ascending: true })
    .order('full_name', { ascending: true })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Students</h1>
          <p className="text-gray-400 text-sm">{students?.length ?? 0} registered</p>
        </div>
        <Link
          href={`/${params.school_slug}/admin/students/register`}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Student
        </Link>
      </div>
      <StudentList students={students ?? []} schoolSlug={params.school_slug} />
    </div>
  )
}