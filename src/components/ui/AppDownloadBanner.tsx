'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Smartphone } from 'lucide-react'

export default function AppDownloadBanner() {
  const [show, setShow] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('app_prompt_dismissed')
        .eq('user_id', user.id)
        .single()

      if (profile && !profile.app_prompt_dismissed) {
        setShow(true)
      }
    }
    check()
  }, [])

  async function dismiss() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('user_profiles')
        .update({ app_prompt_dismissed: true })
        .eq('user_id', user.id)
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-2xl">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-gray-500 hover:text-white"
        >
          <X size={16} />
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Get the App</p>
            <p className="text-gray-400 text-xs mt-0.5">
              Better experience, offline scanning, instant push notifications
            </p>
            <div className="flex gap-2 mt-3">
              <button className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                Download
              </button>
              <button onClick={dismiss} className="text-gray-500 text-xs px-3 py-1.5">
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}