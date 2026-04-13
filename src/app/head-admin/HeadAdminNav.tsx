'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, School, CreditCard, LogOut, Shield } from 'lucide-react'

export default function HeadAdminNav({ adminName }: { adminName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const nav = [
    { href: '/head-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/head-admin/schools', label: 'Schools', icon: School },
    { href: '/head-admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  ]

  async function logout() {
    await fetch('/api/head-admin/auth/logout', { method: 'POST' })
    router.push('/head-admin/login')
  }

  return (
    <aside className="hidden md:flex flex-col w-60 bg-gray-900 border-r border-gray-800 p-4 min-h-screen fixed top-0 left-0">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm">Attendy Admin</span>
        </div>
        <p className="text-gray-500 text-xs px-9">Head Admin Portal</p>
      </div>

      <nav className="flex-1 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              pathname.startsWith(href)
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-800 pt-4">
        <p className="text-gray-500 text-xs px-3 mb-3 truncate">{adminName}</p>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-red-400 text-sm transition-colors w-full"
        >
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    </aside>
  )
}