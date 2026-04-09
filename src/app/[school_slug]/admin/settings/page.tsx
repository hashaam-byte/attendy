'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const { school_slug } = useParams<{ school_slug: string }>()
  const supabase = createClient()

  const [settings, setSettings] = useState({
    late_cutoff: '08:00',
    sms_enabled: true,
    whatsapp_enabled: false,
    timezone: 'Africa/Lagos',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schoolId, setSchoolId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: school } = await supabase
        .from('schools').select('id').eq('slug', school_slug).single()
      if (!school) return
      setSchoolId(school.id)

      const { data } = await supabase
        .from('school_settings')
        .select('*')
        .eq('school_id', school.id)
        .single()

      if (data) {
        setSettings({
          late_cutoff: data.late_cutoff ?? '08:00',
          sms_enabled: data.sms_enabled ?? true,
          whatsapp_enabled: data.whatsapp_enabled ?? false,
          timezone: data.timezone ?? 'Africa/Lagos',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    if (!schoolId) return
    setSaving(true)

    const { error } = await supabase
      .from('school_settings')
      .upsert({
        school_id: schoolId,
        ...settings,
      }, { onConflict: 'school_id' })

    if (error) {
      toast.error('Failed to save settings')
    } else {
      toast.success('Settings saved')
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 size={24} className="animate-spin text-gray-500" />
    </div>
  )

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm">Configure your school's attendance system</p>
      </div>

      <div className="space-y-4">
        {/* Late cutoff */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-white font-semibold mb-1">Late Arrival Cutoff</h2>
          <p className="text-gray-400 text-sm mb-3">
            Students arriving after this time are marked late
          </p>
          <input
            type="time"
            value={settings.late_cutoff}
            onChange={e => setSettings(p => ({ ...p, late_cutoff: e.target.value }))}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Notifications */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-white font-semibold mb-3">Notifications</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-white text-sm">SMS Alerts (Termii)</p>
                <p className="text-gray-400 text-xs">Send SMS to parents on scan</p>
              </div>
              <div
                onClick={() => setSettings(p => ({ ...p, sms_enabled: !p.sms_enabled }))}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  settings.sms_enabled ? 'bg-green-500' : 'bg-gray-700'
                } relative`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.sms_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-white text-sm">WhatsApp Alerts</p>
                <p className="text-gray-400 text-xs">Standard/Pro plan only</p>
              </div>
              <div
                onClick={() => setSettings(p => ({ ...p, whatsapp_enabled: !p.whatsapp_enabled }))}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  settings.whatsapp_enabled ? 'bg-green-500' : 'bg-gray-700'
                } relative`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.whatsapp_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
            </label>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white p-3 rounded-lg font-semibold flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}