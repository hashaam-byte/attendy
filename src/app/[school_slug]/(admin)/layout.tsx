'use client'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, UserCog, BarChart2,
  Settings, LogOut, Menu, X
} from 'lucide-react'
import { useState } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { school_slug } = useParams<{ school_slug: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)

  const nav = [
    { href: `/${school_slug}/admin/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `/${school_slug}/admin/students`, label: 'Students', icon: Users },
    { href: `/${school_slug}/admin/staff`, label: 'Staff', icon: UserCog },
    { href: `/${school_slug}/admin/reports`, label: 'Reports', icon: BarChart2 },
    { href: `/${school_slug}/admin/settings`, label: 'Settings', icon: Settings },
  ]

  async function logout() {
    await supabase.auth.signOut()
    router.push(`/${school_slug}/login`)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-gray-900 border-r border-gray-800 p-4">
        <div className="mb-8 px-2">
          <h2 className="text-white font-bold text-lg capitalize">
            {school_slug.replace(/-/g, ' ')}
          </h2>
          <span className="text-xs text-green-500 font-medium">Admin Portal</span>
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === href
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-red-400 text-sm transition-colors"
        >
          <LogOut size={18} />
          Log Out
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <span className="text-white font-bold capitalize">
          {school_slug.replace(/-/g, ' ')}
        </span>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-white">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-gray-900 pt-16 px-4">
          <nav className="space-y-1">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-gray-800"
              >
                <Icon size={20} />
                {label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-3 text-red-400 w-full"
            >
              <LogOut size={20} />
              Log Out
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:p-8 p-4 mt-14 md:mt-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}