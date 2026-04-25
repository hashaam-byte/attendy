'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function RegisterStudentPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    full_name: '',
    class: '',
    parent_name: '',
    parent_phone: '',
  })
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.full_name || !form.class || !form.parent_phone) {
      toast.error('Please fill in all required fields')
      return
    }

    const phoneRegex = /^(0|\+234)[789][01]\d{8}$/
    if (!phoneRegex.test(form.parent_phone.replace(/\s/g, ''))) {
      toast.error('Enter a valid Nigerian phone number e.g. 08012345678')
      return
    }

    setLoading(true)

    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('slug', school_slug)
      .single()

    if (!school) {
      toast.error('School not found')
      setLoading(false)
      return
    }

    const { data: student, error } = await supabase
      .from('students')
      .insert({
        school_id: school.id,
        full_name: form.full_name.trim(),
        class: form.class.trim(),
        parent_name: form.parent_name.trim() || null,
        parent_phone: form.parent_phone.trim(),
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to register student: ' + error.message)
      setLoading(false)
      return
    }

    // Send registration SMS to parent
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await fetch('/api/notify-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ student_id: student.id, school_id: school.id }),
        })
      }
    } catch {
      // SMS failure should not block registration success
    }

    toast.success('Student registered! SMS sent to parent.')
    router.push(`/${school_slug}/admin/students/${student.id}/qr`)
  }

  const classes = [
    'Nursery 1','Nursery 2','Nursery 3',
    'Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6',
    'JSS 1','JSS 2','JSS 3',
    'SSS 1','SSS 2','SSS 3',
  ]

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${school_slug}/admin/students`}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-white text-2xl font-bold">Register Student</h1>
          <p className="text-gray-400 text-sm">QR card generated automatically · SMS sent to parent</p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
        <div>
          <label className="text-gray-400 text-sm block mb-1">
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            value={form.full_name}
            onChange={e => update('full_name', e.target.value)}
            placeholder="e.g. Adaeze Okonkwo"
            className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-1">
            Class <span className="text-red-400">*</span>
          </label>
          <select
            value={form.class}
            onChange={e => update('class', e.target.value)}
            className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
          >
            <option value="">Select class</option>
            {classes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-1">Parent / Guardian Name</label>
          <input
            value={form.parent_name}
            onChange={e => update('parent_name', e.target.value)}
            placeholder="e.g. Mrs. Ngozi Okonkwo"
            className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-1">
            Parent Phone (for SMS alerts) <span className="text-red-400">*</span>
          </label>
          <input
            value={form.parent_phone}
            onChange={e => update('parent_phone', e.target.value)}
            placeholder="08012345678"
            className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
          />
          <p className="text-gray-600 text-xs mt-1">
            Parent receives SMS on registration and every gate scan. Also used for parent portal login.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white p-3 rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Registering...' : 'Register & Generate QR Card'}
        </button>
      </div>
    </div>
  )
}
