"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  LogOut, User, GraduationCap, AlertTriangle,
  MessageCircle, Mail, ChevronDown, Settings,
  Bell, KeyRound, Shield, X,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { OrgContextValue } from "@/context/org-context";
import Image from "next/image";
import { cn, formatDate } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const PAGE_TITLES: Record<string, string> = {
  dashboard:     "Dashboard",
  students:      "Students",
  classes:       "Classes",
  scanner:       "Gate Scanner",
  absent:        "Absent Today",
  reports:       "Reports",
  notifications: "Notifications",
  settings:      "Settings",
  "qr-cards":    "QR Cards",
  notices:       "School Notices",
  excuses:       "Excuse Requests",
  "my-class":    "My Class",
};

const PAGE_SUBS: Record<string, string> = {
  dashboard:     "Today's overview",
  students:      "Manage enrolled students",
  scanner:       "Scan QR cards at gate",
  absent:        "Students not yet scanned",
  reports:       "Attendance analytics",
  settings:      "School configuration",
  "qr-cards":    "Design & print ID cards",
  notices:       "School announcements",
  excuses:       "Absence requests",
  "my-class":    "Your assigned class",
};

interface Props {
  user:  SupabaseUser;
  org:   OrgContextValue;
  role:  string;
  slug:  string;
}

export function SlugTopbar({ user, org, role, slug }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const segments  = pathname.split("/").filter(Boolean);
  const pageKey   = segments[1] ?? "dashboard";
  const title     = PAGE_TITLES[pageKey] ?? "Attendy";
  const subtitle  = PAGE_SUBS[pageKey] ?? "";

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const planExpiresAt  = org.planExpiresAt ? new Date(org.planExpiresAt) : null;
  const now            = new Date();
  const daysLeft       = planExpiresAt
    ? Math.ceil((planExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpired      = daysLeft !== null && daysLeft < 0;
  const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  const showBanner     = isExpired || isExpiringSoon;

  const waMessage = encodeURIComponent(`Hi Attendy, I need to renew the subscription for ${org.name} (${org.slug}).`);
  const waLink    = `https://wa.me/2348077291745?text=${waMessage}`;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push(`/${slug}/login`);
    router.refresh();
  }

  const userInitial = (user.email ?? "U")[0].toUpperCase();

  return (
    <>
      <header className="h-14 shrink-0 flex items-center justify-between px-4 lg:px-6 border-b border-[#d1f0dc] dark:border-[#162e1f] bg-white dark:bg-[#0a1912] z-20">

        {/* Left – page title */}
        <div className="flex items-center gap-3 pl-10 lg:pl-0 min-w-0">
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[#0d1f14] dark:text-[#e4f5ec] leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-[#7aab8a] hidden sm:block leading-tight">{subtitle}</p>
            )}
          </div>

          {/* Org chip */}
          <span
            className="hidden md:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border shrink-0"
            style={{
              backgroundColor: `${org.primaryColor}12`,
              borderColor:     `${org.primaryColor}35`,
              color:           org.primaryColor,
            }}
          >
            {org.logoUrl ? (
              <Image src={org.logoUrl} alt={org.name} width={14} height={14} className="rounded-sm object-contain" />
            ) : (
              <GraduationCap size={11} />
            )}
            {org.name}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <ThemeToggle compact />

          {/* Notification bell */}
          <Link
            href={`/${slug}/notifications`}
            className="p-2 rounded-lg hover:bg-[#edfaf2] dark:hover:bg-[rgba(15,45,28,0.4)] text-[#7aab8a] hover:text-[#1a9e50] dark:hover:text-[#2ec467] transition-colors"
          >
            <Bell size={16} />
          </Link>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all",
                showDropdown
                  ? "bg-[#edfaf2] dark:bg-[rgba(15,45,28,0.5)] border-[#a3d9b5] dark:border-[#244532]"
                  : "hover:bg-[#edfaf2] dark:hover:bg-[rgba(15,45,28,0.3)] border-transparent hover:border-[#d1f0dc] dark:hover:border-[#162e1f]"
              )}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${org.primaryColor}, ${org.primaryColor}bb)` }}
              >
                {userInitial}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-[#0d1f14] dark:text-[#e4f5ec] max-w-[100px] truncate leading-tight">
                  {user.email?.split("@")[0] ?? "User"}
                </p>
                <p className="text-[10px] text-[#7aab8a] capitalize leading-tight">{role}</p>
              </div>
              <ChevronDown size={13} className={cn("text-[#7aab8a] transition-transform duration-200 hidden sm:block", showDropdown && "rotate-180")} />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white dark:bg-[#0d1e17] border border-[#d1f0dc] dark:border-[#162e1f] rounded-2xl shadow-xl dark:shadow-black/40 py-1.5 z-50">
                {/* User info */}
                <div className="px-4 py-2.5 border-b border-[#d1f0dc] dark:border-[#162e1f]">
                  <p className="text-xs font-semibold text-[#0d1f14] dark:text-[#e4f5ec] truncate">{user.email}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: org.primaryColor }}
                    />
                    <p className="text-[10px] text-[#7aab8a] capitalize font-medium">{org.name} · {role}</p>
                  </div>
                </div>

                {/* Links */}
                <div className="py-1">
                  {[
                    { href: `/${slug}/settings`, icon: Settings, label: "Settings" },
                    { href: `/${slug}/settings/change-password`, icon: KeyRound, label: "Change Password" },
                    { href: `/${slug}/notifications`, icon: Bell, label: "Notifications" },
                  ].map(({ href, icon: Icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-[#2e5c3e] dark:text-[#9ecfae] hover:bg-[#edfaf2] dark:hover:bg-[rgba(15,45,28,0.4)] transition-colors"
                    >
                      <Icon size={14} className="text-[#7aab8a]" />
                      {label}
                    </Link>
                  ))}
                </div>

                {/* Role badge */}
                <div className="px-4 py-2 border-t border-[#d1f0dc] dark:border-[#162e1f]">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={12} className="text-[#7aab8a]" />
                    <span className="text-[11px] text-[#7aab8a] capitalize">{role} access</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Expiry banner */}
      {showBanner && (
        <div className={cn(
          "flex items-center gap-3 px-4 py-2 border-b text-xs",
          isExpired
            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40"
            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40"
        )}>
          <AlertTriangle size={13} className={isExpired ? "text-red-500 shrink-0" : "text-amber-500 shrink-0"} />
          <p className={cn("flex-1", isExpired ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300")}>
            {isExpired
              ? `Plan expired on ${formatDate(org.planExpiresAt)}.`
              : `Plan expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} (${formatDate(org.planExpiresAt)}).`
            }
            {" "}Renew to keep full access.
          </p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-white text-xs font-semibold shrink-0"
            style={{ background: isExpired ? "#dc2626" : "#d97706" }}
          >
            <MessageCircle size={11} />
            Renew
          </a>
        </div>
      )}
    </>
  );
}