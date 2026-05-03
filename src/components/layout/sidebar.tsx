"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, BookOpen, ScanLine,
  BarChart3, Bell, Settings, X, Menu, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { label: "Dashboard",     href: "/dashboard",      icon: LayoutDashboard },
  { label: "Students",      href: "/students",       icon: Users },
  { label: "Classes",       href: "/classes",        icon: BookOpen },
  { label: "Scanner",       href: "/scanner",        icon: ScanLine },
  { label: "Reports",       href: "/reports",        icon: BarChart3 },
  { label: "Notifications", href: "/notifications",  icon: Bell },
  { label: "Settings",      href: "/settings",       icon: Settings },
];

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#bbf7d0] dark:border-[#1a3a24]">
        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center shadow-sm shadow-green-500/30">
          <GraduationCap size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Attendy</p>
          <p className="text-[10px] text-green-600 dark:text-green-400 uppercase tracking-wider">Education</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-green-600 text-white shadow-sm shadow-green-500/20"
                  : "text-slate-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-700 dark:hover:text-white"
              )}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#bbf7d0] dark:border-[#1a3a24]">
        <p className="text-[10px] text-slate-400 dark:text-[#4a7a5a]">Attendy Edu v1.0 · Nigeria</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-white dark:bg-[#0c1a12] border-r border-[#bbf7d0] dark:border-[#1a3a24] h-full">
        <NavContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-[#0f2018] border border-[#bbf7d0] dark:border-[#1a3a24] shadow-sm"
        aria-label="Open menu"
      >
        <Menu size={18} className="text-slate-600 dark:text-green-300" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0c1a12] border-r border-[#bbf7d0] dark:border-[#1a3a24] transform transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-slate-400"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
        <NavContent onClose={() => setMobileOpen(false)} />
      </aside>
    </>
  );
}