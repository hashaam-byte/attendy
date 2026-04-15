'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Save, Loader2, Clock, Bell, MessageSquare, Globe } from 'lucide-react'

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
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 200, gap: 12,
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 11, color: '#3a4e40', letterSpacing: 2,
      textTransform: 'uppercase',
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        border: '2px solid #1a2420', borderTopColor: '#00e676',
        animation: 'spin 0.8s linear infinite',
      }} />
      Loading settings...
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }

        .st-wrap {
          max-width: 560px;
        }

        .st-header {
          margin-bottom: 28px;
        }
        .st-title {
          font-size: 22px;
          font-weight: 600;
          color: #e2ece6;
          letter-spacing: -0.5px;
          font-family: 'IBM Plex Sans', sans-serif;
        }
        .st-sub {
          font-size: 11px;
          color: #5a7060;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-top: 3px;
        }

        .st-card {
          background: #0d1410;
          border: 1px solid #1a2420;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .st-card-header {
          padding: 14px 20px;
          border-bottom: 1px solid #1a2420;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .st-card-icon {
          width: 28px; height: 28px;
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .st-card-title {
          font-size: 12px;
          font-weight: 600;
          font-family: 'IBM Plex Mono', monospace;
          color: #e2ece6;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .st-card-body {
          padding: 20px;
        }

        .st-field-label {
          font-size: 10px;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #5a7060;
          margin-bottom: 6px;
          display: block;
        }
        .st-field-hint {
          font-size: 11px;
          color: #3a4e40;
          font-family: 'IBM Plex Sans', sans-serif;
          margin-top: 6px;
          line-height: 1.5;
        }

        .st-time-input {
          background: #0a100c;
          border: 1px solid #1a2420;
          border-radius: 7px;
          padding: 11px 14px;
          font-size: 18px;
          font-family: 'IBM Plex Mono', monospace;
          color: #4ade80;
          letter-spacing: 2px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          color-scheme: dark;
        }
        .st-time-input:focus {
          border-color: rgba(0,230,118,0.4);
          box-shadow: 0 0 0 3px rgba(0,230,118,0.07);
        }

        .st-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid #111c14;
          gap: 16px;
        }
        .st-toggle-row:last-child { border-bottom: none; }

        .st-toggle-info { flex: 1; }
        .st-toggle-name {
          font-size: 13px;
          font-weight: 500;
          color: #c8dcc8;
          margin-bottom: 3px;
        }
        .st-toggle-desc {
          font-size: 11px;
          color: #3a4e40;
          font-family: 'IBM Plex Mono', monospace;
        }

        .st-toggle {
          width: 40px; height: 22px;
          border-radius: 11px;
          cursor: pointer;
          position: relative;
          transition: background 0.2s;
          border: none;
          flex-shrink: 0;
        }
        .st-toggle.on { background: #16a34a; }
        .st-toggle.off { background: #1a2420; border: 1px solid #243028; }
        .st-toggle::after {
          content: '';
          position: absolute;
          top: 2px; left: 2px;
          width: 16px; height: 16px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        .st-toggle.on::after { transform: translateX(18px); }

        .st-badge {
          font-size: 9px;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 0.5px;
          padding: 2px 7px;
          border-radius: 3px;
          text-transform: uppercase;
        }

        .st-select {
          background: #0a100c;
          border: 1px solid #1a2420;
          border-radius: 7px;
          padding: 11px 14px;
          font-size: 13px;
          font-family: 'IBM Plex Mono', monospace;
          color: #c8dcc8;
          outline: none;
          width: 100%;
          transition: border-color 0.2s;
          cursor: pointer;
        }
        .st-select:focus { border-color: rgba(0,230,118,0.4); }

        .st-save-btn {
          width: 100%;
          background: #16a34a;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px;
          font-size: 13px;
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          margin-top: 16px;
        }
        .st-save-btn:hover {
          background: #15803d;
          box-shadow: 0 4px 16px rgba(22,163,74,0.25);
        }
        .st-save-btn:active { transform: scale(0.99); }
        .st-save-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

        .st-info-note {
          background: rgba(83,82,237,0.06);
          border: 1px solid rgba(83,82,237,0.15);
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 11px;
          color: #818cf8;
          font-family: 'IBM Plex Mono', monospace;
          line-height: 1.6;
          margin-bottom: 12px;
        }
      `}</style>

      <div className="st-wrap">
        <div className="st-header">
          <div className="st-title">Settings</div>
          <div className="st-sub">Configure your attendance system</div>
        </div>

        <div className="st-info-note">
          💡 Changes take effect immediately for all future scans. Existing attendance records are not affected.
        </div>

        {/* Late cutoff */}
        <div className="st-card">
          <div className="st-card-header">
            <div className="st-card-icon" style={{ background: 'rgba(255,211,42,0.08)' }}>
              <Clock size={14} color="#fbbf24" />
            </div>
            <span className="st-card-title">Late Arrival Cutoff</span>
          </div>
          <div className="st-card-body">
            <label className="st-field-label">Cutoff time</label>
            <input
              type="time"
              value={settings.late_cutoff}
              onChange={e => setSettings(p => ({ ...p, late_cutoff: e.target.value }))}
              className="st-time-input"
            />
            <div className="st-field-hint">
              Students scanning after this time will be marked as <span style={{ color: '#fbbf24' }}>LATE</span>.
              Currently set to <span style={{ color: '#e2ece6', fontFamily: 'IBM Plex Mono, monospace' }}>{settings.late_cutoff}</span>.
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="st-card">
          <div className="st-card-header">
            <div className="st-card-icon" style={{ background: 'rgba(0,230,118,0.08)' }}>
              <Bell size={14} color="#4ade80" />
            </div>
            <span className="st-card-title">Parent Notifications</span>
          </div>
          <div className="st-card-body" style={{ paddingBottom: 6 }}>
            <div className="st-toggle-row">
              <div className="st-toggle-info">
                <div className="st-toggle-name">SMS Alerts via Termii</div>
                <div className="st-toggle-desc">Text parents when their child scans in</div>
              </div>
              <button
                className={`st-toggle ${settings.sms_enabled ? 'on' : 'off'}`}
                onClick={() => setSettings(p => ({ ...p, sms_enabled: !p.sms_enabled }))}
              />
            </div>
            <div className="st-toggle-row">
              <div className="st-toggle-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="st-toggle-name">WhatsApp Alerts</div>
                  <span className="st-badge" style={{ background: 'rgba(83,82,237,0.1)', color: '#818cf8', border: '1px solid rgba(83,82,237,0.2)' }}>
                    Standard+
                  </span>
                </div>
                <div className="st-toggle-desc">WhatsApp messages to parents (requires plan upgrade)</div>
              </div>
              <button
                className={`st-toggle ${settings.whatsapp_enabled ? 'on' : 'off'}`}
                onClick={() => setSettings(p => ({ ...p, whatsapp_enabled: !p.whatsapp_enabled }))}
              />
            </div>
          </div>
        </div>

        {/* Timezone */}
        <div className="st-card">
          <div className="st-card-header">
            <div className="st-card-icon" style={{ background: 'rgba(83,82,237,0.08)' }}>
              <Globe size={14} color="#818cf8" />
            </div>
            <span className="st-card-title">Timezone</span>
          </div>
          <div className="st-card-body">
            <label className="st-field-label">School timezone</label>
            <select
              value={settings.timezone}
              onChange={e => setSettings(p => ({ ...p, timezone: e.target.value }))}
              className="st-select"
            >
              <option value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</option>
              <option value="Africa/Abuja">Africa/Abuja (WAT, UTC+1)</option>
              <option value="UTC">UTC</option>
            </select>
            <div className="st-field-hint">Used for late cutoff calculations and report timestamps.</div>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="st-save-btn"
        >
          {saving ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={15} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </>
  )
}