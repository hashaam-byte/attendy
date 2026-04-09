'use client'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { QrCode, ClipboardList, LogOut } from 'lucide-react'
import AppDownloadBanner from '@/components/ui/AppDownloadBanner'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { school_slug } = useParams<{ school_slug: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push(`/${school_slug}/login`)
  }

  const nav = [
    { href: `/${school_slug}/teacher/scan`, label: 'Scan', icon: QrCode },
    { href: `/${school_slug}/teacher/attendance`, label: 'Attendance', icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      {children}
      {/* Bottom nav for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
              pathname === href ? 'text-green-400' : 'text-gray-500'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="flex-1 flex flex-col items-center py-3 gap-1 text-xs text-gray-500"
        >
          <LogOut size={20} />
          Logout
        </button>
      </nav>
      <AppDownloadBanner />
    </div>
  )
}