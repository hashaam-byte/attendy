'use client'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, UserCog, BarChart2,
  Settings, LogOut, Menu, X, ChevronLeft, ChevronRight,
  Scan, Bell
} from 'lucide-react'
import { useState, useEffect } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { school_slug } = useParams<{ school_slug: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [schoolName, setSchoolName] = useState('')

  useEffect(() => {
    setSchoolName(school_slug.replace(/-/g, ' '))
  }, [school_slug])

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

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="admin-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        :root {
          --bg: #080c0a;
          --surface: #0d1410;
          --surface2: #121a14;
          --border: #1a2420;
          --border2: #243028;
          --green: #00e676;
          --green-dim: rgba(0,230,118,0.08);
          --green-glow: rgba(0,230,118,0.15);
          --green-text: #4ade80;
          --text: #e2ece6;
          --muted: #5a7060;
          --muted2: #3a4e40;
          --red: #ff4757;
          --yellow: #ffd32a;
          --blue: #5352ed;
          --mono: 'IBM Plex Mono', monospace;
          --sans: 'IBM Plex Sans', sans-serif;
          --sidebar-w: 220px;
          --sidebar-collapsed: 60px;
          --topbar-h: 52px;
          --transition: 0.2s cubic-bezier(0.4,0,0.2,1);
        }

        .admin-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg);
          font-family: var(--sans);
          color: var(--text);
          position: relative;
        }

        /* ─── SIDEBAR ─── */
        .sidebar {
          position: fixed;
          top: 0; left: 0; bottom: 0;
          width: var(--sidebar-w);
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          transition: width var(--transition);
          z-index: 200;
          overflow: hidden;
        }
        .sidebar.collapsed { width: var(--sidebar-collapsed); }

        .sidebar-top {
          height: var(--topbar-h);
          display: flex;
          align-items: center;
          padding: 0 14px;
          border-bottom: 1px solid var(--border);
          gap: 10px;
          flex-shrink: 0;
        }

        .sidebar-logo {
          width: 28px; height: 28px; min-width: 28px;
          background: #16a34a;
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sidebar-logo svg { display: block; }

        .sidebar-school {
          overflow: hidden;
          opacity: 1;
          transition: opacity var(--transition), width var(--transition);
          white-space: nowrap;
        }
        .collapsed .sidebar-school { opacity: 0; width: 0; }

        .sidebar-school-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          text-transform: capitalize;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-school-role {
          font-size: 10px;
          color: var(--green-text);
          font-family: var(--mono);
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .sidebar-nav {
          flex: 1;
          padding: 10px 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 6px;
          text-decoration: none;
          color: var(--muted);
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          transition: background var(--transition), color var(--transition);
          position: relative;
          min-width: 0;
        }
        .nav-item:hover {
          background: var(--green-dim);
          color: var(--text);
        }
        .nav-item.active {
          background: var(--green-dim);
          color: var(--green-text);
          border: 1px solid rgba(0,230,118,0.12);
        }
        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 50%;
          transform: translateY(-50%);
          width: 2px; height: 16px;
          background: var(--green);
          border-radius: 0 2px 2px 0;
        }

        .nav-icon { flex-shrink: 0; width: 16px; height: 16px; }

        .nav-label {
          overflow: hidden;
          opacity: 1;
          transition: opacity var(--transition);
          flex: 1;
        }
        .collapsed .nav-label { opacity: 0; width: 0; overflow: hidden; }

        /* Tooltip for collapsed state */
        .nav-item .nav-tooltip {
          display: none;
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          background: var(--surface2);
          border: 1px solid var(--border2);
          color: var(--text);
          font-size: 12px;
          padding: 5px 10px;
          border-radius: 5px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 300;
        }
        .collapsed .nav-item:hover .nav-tooltip { display: block; }

        .sidebar-bottom {
          padding: 8px;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 9px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          transition: background var(--transition), color var(--transition);
          gap: 10px;
          white-space: nowrap;
          font-size: 12px;
          font-family: var(--sans);
        }
        .sidebar-toggle:hover { background: var(--green-dim); color: var(--text); }
        .toggle-label {
          opacity: 1;
          transition: opacity var(--transition);
        }
        .collapsed .toggle-label { opacity: 0; width: 0; overflow: hidden; }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          font-size: 13px;
          font-family: var(--sans);
          width: 100%;
          white-space: nowrap;
          transition: background var(--transition), color var(--transition);
          position: relative;
        }
        .logout-btn:hover { background: rgba(255,71,87,0.08); color: var(--red); }
        .logout-btn .nav-label { font-weight: 500; }
        .logout-btn .nav-tooltip { display: none; }
        .collapsed .logout-btn:hover .nav-tooltip { display: block; }

        /* ─── MAIN ─── */
        .admin-main {
          flex: 1;
          margin-left: var(--sidebar-w);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          transition: margin-left var(--transition);
        }
        .admin-main.sidebar-collapsed { margin-left: var(--sidebar-collapsed); }

        /* ─── TOPBAR ─── */
        .topbar {
          height: var(--topbar-h);
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .topbar-mobile-menu {
          display: none;
          align-items: center;
          justify-content: center;
          width: 32px; height: 32px;
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          border-radius: 6px;
        }
        .topbar-mobile-menu:hover { background: var(--green-dim); color: var(--text); }

        .topbar-breadcrumb {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-family: var(--mono);
          color: var(--muted);
          overflow: hidden;
        }
        .topbar-breadcrumb-sep { color: var(--muted2); }
        .topbar-breadcrumb-current {
          color: var(--text);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .topbar-badge {
          height: 28px;
          padding: 0 10px;
          background: var(--green-dim);
          border: 1px solid rgba(0,230,118,0.15);
          border-radius: 5px;
          font-size: 10px;
          font-family: var(--mono);
          color: var(--green-text);
          letter-spacing: 1px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .topbar-dot {
          width: 5px; height: 5px;
          background: var(--green);
          border-radius: 50%;
          box-shadow: 0 0 4px var(--green);
          animation: blink 2s infinite;
        }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* ─── CONTENT ─── */
        .admin-content {
          flex: 1;
          padding: 28px 28px;
          max-width: 1300px;
          width: 100%;
          margin: 0 auto;
        }

        /* ─── MOBILE OVERLAY ─── */
        .mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          z-index: 150;
          backdrop-filter: blur(2px);
        }

        /* ─── SCANLINE TEXTURE ─── */
        .admin-shell::before {
          content: '';
          position: fixed; inset: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0,0,0,0.015) 2px, rgba(0,0,0,0.015) 4px
          );
          pointer-events: none;
          z-index: 0;
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            width: var(--sidebar-w) !important;
            box-shadow: 4px 0 40px rgba(0,0,0,0.5);
          }
          .sidebar.mobile-open {
            transform: translateX(0);
          }
          .mobile-overlay { display: block; }
          .mobile-overlay.hidden { display: none; }
          .admin-main { margin-left: 0 !important; }
          .topbar-mobile-menu { display: flex; }
          .admin-content { padding: 16px; }
          .topbar { padding: 0 16px; }
          .sidebar-toggle { display: none; }
        }
      `}</style>

      {/* Mobile overlay */}
      <div
        className={`mobile-overlay ${mobileOpen ? '' : 'hidden'}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Top */}
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7 12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z"/>
            </svg>
          </div>
          <div className="sidebar-school">
            <div className="sidebar-school-name">{schoolName}</div>
            <div className="sidebar-school-role">Admin Portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive(href) ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="nav-icon" size={16} />
              <span className="nav-label">{label}</span>
              <span className="nav-tooltip">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)}>
            {collapsed
              ? <ChevronRight size={14} />
              : <><ChevronLeft size={14} /><span className="toggle-label">Collapse</span></>
            }
          </button>
          <button className="logout-btn" onClick={logout}>
            <LogOut className="nav-icon" size={16} />
            <span className="nav-label">Log Out</span>
            <span className="nav-tooltip">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`admin-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Topbar */}
        <div className="topbar">
          <button className="topbar-mobile-menu" onClick={() => setMobileOpen(true)}>
            <Menu size={18} />
          </button>

          <div className="topbar-breadcrumb">
            <span style={{ textTransform: 'capitalize' }}>{schoolName}</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-breadcrumb-current">
              {nav.find(n => isActive(n.href))?.label ?? 'Admin'}
            </span>
          </div>

          <div className="topbar-right">
            <div className="topbar-badge">
              <span className="topbar-dot" />
              Live
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="admin-content">
          {children}
        </div>
      </div>
    </div>
  )
}