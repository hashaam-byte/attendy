"use client";
// src/components/layout/slug-sidebar.tsx — ATTENDY-EDU v3
// Slug-aware sidebar — all links are prefixed with /[slug]/

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, BookOpen, ScanLine, BarChart3,
  Bell, Settings, X, Menu, GraduationCap, UserX, QrCode,
  TrendingUp, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

function navItems(slug: string, role: string) {
  const base = [
    { label: "Dashboard", href: `/${slug}/dashboard`, icon: LayoutDashboard },
    { label: "Students", href: `/${slug}/students`, icon: Users },
    { label: "Classes", href: `/${slug}/classes`, icon: BookOpen },
    { label: "Scanner", href: `/${slug}/scanner`, icon: ScanLine },
    { label: "Absent Today", href: `/${slug}/absent`, icon: UserX },
    { label: "QR Cards", href: `/${slug}/qr-cards`, icon: QrCode },
    { label: "Reports", href: `/${slug}/reports`, icon: BarChart3 },
    { label: "Notifications", href: `/${slug}/notifications`, icon: Bell },
  ];

  // Admin-only items
  if (role === "admin") {
    base.push({ label: "Settings", href: `/${slug}/settings`, icon: Settings });
  }

  return base;
}

interface Props {
  slug: string;
  role: string;
  orgName: string;
  primaryColor: string;
}

function NavContent({ slug, role, orgName, primaryColor, onClose }: Props & { onClose?: () => void }) {
  const pathname = usePathname();
  const items = navItems(slug, role);

  return (
    <div className="flex flex-col h-full">
      {/* Org branding header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#bbf7d0] dark:border-[#1a3a24]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          <GraduationCap size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">{orgName}</p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: primaryColor }}>Education</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "text-white shadow-sm"
                  : "text-slate-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-700 dark:hover:text-white"
              )}
              style={isActive ? { backgroundColor: primaryColor } : {}}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Role badge */}
      <div className="px-4 py-3 border-t border-[#bbf7d0] dark:border-[#1a3a24]">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize"
            style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
          >
            {role}
          </span>
          <p className="text-[10px] text-slate-400 dark:text-[#4a7a5a]">Attendy Edu v2</p>
        </div>
      </div>
    </div>
  );
}

export function SlugSidebar({ slug, role, orgName, primaryColor }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-white dark:bg-[#0c1a12] border-r border-[#bbf7d0] dark:border-[#1a3a24] h-full">
        <NavContent slug={slug} role={role} orgName={orgName} primaryColor={primaryColor} />
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-[#0f2018] border border-[#bbf7d0] dark:border-[#1a3a24] shadow-sm"
      >
        <Menu size={18} className="text-slate-600 dark:text-green-300" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0c1a12] border-r border-[#bbf7d0] dark:border-[#1a3a24] transform transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-slate-400"
        >
          <X size={16} />
        </button>
        <NavContent
          slug={slug}
          role={role}
          orgName={orgName}
          primaryColor={primaryColor}
          onClose={() => setMobileOpen(false)}
        />
      </aside>
    </>
  );
}