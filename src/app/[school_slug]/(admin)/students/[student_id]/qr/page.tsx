import { createClient } from '@/lib/supabase/server'
import QRCardClient from './QRCardClient'
import { notFound } from 'next/navigation'

export default async function QRPage({
  params,
}: {
  params: { school_slug: string; student_id: string }
}) {
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', params.student_id)
    .single()

  const { data: school } = await supabase
    .from('schools')
    .select('name')
    .eq('slug', params.school_slug)
    .single()

  if (!student) notFound()

  return (
    <QRCardClient
      student={student}
      schoolName={school?.name ?? ''}
      schoolSlug={params.school_slug}
    />
  )
}