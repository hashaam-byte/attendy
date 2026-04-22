'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Phone } from 'lucide-react'
import Link from 'next/link'

// Common country codes — easily extendable
const COUNTRY_CODES = [
  { code: '234', flag: '🇳🇬', name: 'Nigeria', format: '0812 345 6789' },
  { code: '233', flag: '🇬🇭', name: 'Ghana', format: '024 123 4567' },
  { code: '254', flag: '🇰🇪', name: 'Kenya', format: '0712 345 678' },
  { code: '27', flag: '🇿🇦', name: 'South Africa', format: '082 123 4567' },
  { code: '256', flag: '🇺🇬', name: 'Uganda', format: '0712 345 678' },
  { code: '255', flag: '🇹🇿', name: 'Tanzania', format: '0712 345 678' },
  { code: '44', flag: '🇬🇧', name: 'UK', format: '07700 900000' },
  { code: '1', flag: '🇺🇸', name: 'USA/Canada', format: '555 123 4567' },
  { code: '971', flag: '🇦🇪', name: 'UAE', format: '050 123 4567' },
]

// Normalise to E.164 without + prefix (what Termii expects)
function buildE164(countryCode: string, localNumber: string): string {
  // Strip all non-digits from local number
  let local = localNumber.replace(/\D/g, '')
  // Remove leading 0 if present (common in Nigerian/African local format)
  if (local.startsWith('0')) {
    local = local.slice(1)
  }
  return countryCode + local
}

const CLASSES = [
  'Nursery 1', 'Nursery 2', 'Nursery 3',
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'JSS 1', 'JSS 2', 'JSS 3',
  'SSS 1', 'SSS 2', 'SSS 3',
]

export default function RegisterStudentPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    full_name: '',
    class: '',
    parent_name: '',
    parent_phone_local: '',
    country_code: '234', // Default to Nigeria
  })
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === form.country_code) ?? COUNTRY_CODES[0]
  const e164Phone = form.parent_phone_local
    ? buildE164(form.country_code, form.parent_phone_local)
    : ''

  async function handleSubmit() {
    if (!form.full_name || !form.class || !form.parent_phone_local) {
      toast.error('Please fill in all required fields')
      return
    }

    if (form.parent_phone_local.replace(/\D/g, '').length < 7) {
      toast.error('Please enter a valid phone number')
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

    // Store the normalised E.164 phone in the DB
    const { data: student, error } = await supabase
      .from('students')
      .insert({
        school_id: school.id,
        full_name: form.full_name.trim(),
        class: form.class.trim(),
        parent_name: form.parent_name.trim() || null,
        parent_phone: e164Phone, // Store as E.164 e.g. 2348012345678
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to register student: ' + error.message)
      setLoading(false)
      return
    }

    // Check if parent account already exists
    const { data: existingParent } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('phone', e164Phone)
      .eq('school_id', school.id)
      .eq('role', 'parent')
      .single()

    if (existingParent) {
      toast.success(`Student registered! Linked to parent: ${existingParent.full_name}`)
    } else {
      toast.success('Student registered! Parent will be linked when they create an account.')
    }

    router.push(`/${school_slug}/admin/students/${student.id}/qr`)
  }

  return (
    <div className="max-w-lg">
      <style>{`
        .reg-wrap { font-family: 'IBM Plex Sans', sans-serif; color: #e2ece6; }
        .reg-header { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
        .back-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 7px; border: 1px solid #243028; background: transparent; color: #5a7060; cursor: pointer; text-decoration: none; transition: all 0.15s; }
        .back-btn:hover { background: rgba(0,230,118,0.08); color: #e2ece6; }
        .reg-title { font-size: 22px; font-weight: 600; letter-spacing: -0.5px; }
        .reg-sub { font-size: 12px; color: #5a7060; font-family: 'IBM Plex Mono', monospace; margin-top: 3px; }

        .reg-card { background: #0d1410; border: 1px solid #1a2420; border-radius: 12px; padding: 24px; }

        .field { margin-bottom: 16px; }
        .field-label { display: block; font-size: 10px; font-family: 'IBM Plex Mono', monospace; letter-spacing: 1.5px; text-transform: uppercase; color: #5a7060; margin-bottom: 7px; }
        .field-required { color: #f87171; }

        .field-input { width: 100%; background: #0a100c; border: 1px solid #1a2420; border-radius: 8px; padding: 11px 14px; font-size: 14px; font-family: 'IBM Plex Sans', sans-serif; color: #e2ece6; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .field-input:focus { border-color: rgba(0,230,118,0.4); box-shadow: 0 0 0 3px rgba(0,230,118,0.07); }
        .field-input::placeholder { color: #2a3e30; }

        .field-select { width: 100%; background: #0a100c; border: 1px solid #1a2420; border-radius: 8px; padding: 11px 14px; font-size: 14px; font-family: 'IBM Plex Sans', sans-serif; color: #e2ece6; outline: none; cursor: pointer; }

        /* Phone field with country code */
        .phone-row { display: flex; gap: 8px; }
        .country-select { background: #0a100c; border: 1px solid #1a2420; border-radius: 8px; padding: 11px 12px; font-size: 13px; font-family: 'IBM Plex Mono', monospace; color: #e2ece6; outline: none; cursor: pointer; min-width: 140px; flex-shrink: 0; transition: border-color 0.2s; }
        .country-select:focus { border-color: rgba(0,230,118,0.4); }
        .phone-input { flex: 1; background: #0a100c; border: 1px solid #1a2420; border-radius: 8px; padding: 11px 14px; font-size: 14px; font-family: 'IBM Plex Mono', monospace; color: #e2ece6; outline: none; transition: border-color 0.2s, box-shadow 0.2s; letter-spacing: 0.5px; }
        .phone-input:focus { border-color: rgba(0,230,118,0.4); box-shadow: 0 0 0 3px rgba(0,230,118,0.07); }
        .phone-input::placeholder { color: #2a3e30; letter-spacing: 0; }

        .phone-preview { margin-top: 6px; font-size: 11px; color: #3a4e40; font-family: 'IBM Plex Mono', monospace; }
        .phone-preview span { color: #4ade80; }

        .field-hint { font-size: 11px; color: #3a4e40; font-family: 'IBM Plex Sans', sans-serif; margin-top: 6px; line-height: 1.5; }

        .submit-btn { width: 100%; background: #16a34a; color: white; border: none; border-radius: 8px; padding: 14px; font-size: 14px; font-family: 'IBM Plex Sans', sans-serif; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s, box-shadow 0.15s; margin-top: 8px; }
        .submit-btn:hover { background: #15803d; box-shadow: 0 4px 16px rgba(22,163,74,0.25); }
        .submit-btn:active { transform: scale(0.99); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
      `}</style>

      <div className="reg-wrap">
        <div className="reg-header">
          <Link href={`/${school_slug}/admin/students`} className="back-btn">
            <ArrowLeft size={15} />
          </Link>
          <div>
            <div className="reg-title">Register Student</div>
            <div className="reg-sub">QR card will be generated automatically</div>
          </div>
        </div>

        <div className="reg-card">
          <div className="field">
            <label className="field-label">
              Full Name <span className="field-required">*</span>
            </label>
            <input
              className="field-input"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              placeholder="e.g. Adaeze Okonkwo"
            />
          </div>

          <div className="field">
            <label className="field-label">
              Class <span className="field-required">*</span>
            </label>
            <select
              className="field-select"
              value={form.class}
              onChange={(e) => update('class', e.target.value)}
            >
              <option value="">Select class</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label">Parent / Guardian Name</label>
            <input
              className="field-input"
              value={form.parent_name}
              onChange={(e) => update('parent_name', e.target.value)}
              placeholder="e.g. Mrs. Ngozi Okonkwo"
            />
          </div>

          <div className="field">
            <label className="field-label">
              Parent Phone (for SMS alerts) <span className="field-required">*</span>
            </label>
            <div className="phone-row">
              <select
                className="country-select"
                value={form.country_code}
                onChange={(e) => update('country_code', e.target.value)}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} +{c.code} {c.name}
                  </option>
                ))}
              </select>
              <input
                className="phone-input"
                type="tel"
                value={form.parent_phone_local}
                onChange={(e) => update('parent_phone_local', e.target.value)}
                placeholder={selectedCountry.format}
              />
            </div>
            {form.parent_phone_local && (
              <div className="phone-preview">
                SMS will be sent to: <span>+{e164Phone}</span>
              </div>
            )}
            <div className="field-hint">
              Include your country code. Nigerian numbers: 08012345678 or 8012345678.
              This number also links the parent portal to this student.
            </div>
          </div>

          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register & Generate QR Card'}
          </button>
        </div>
      </div>
    </div>
  )
}