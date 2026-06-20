"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  LogOut, GraduationCap, AlertTriangle,
  MessageCircle, ChevronDown, Settings,
  Bell, KeyRound, Shield, UserCircle,
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

  const dropdownLinks = [
    { href: `/${slug}/settings`, icon: Settings, label: "Settings" },
    { href: `/${slug}/settings/change-password`, icon: KeyRound, label: "Change Password" },
    { href: `/${slug}/notifications`, icon: Bell, label: "Notifications" },
  ];

  return (
    <>
      <header
        className="h-14 shrink-0 flex items-center justify-between px-4 lg:px-6 border-b z-20"
        style={{ backgroundColor: "var(--bg-sidebar)", borderColor: "var(--border)" }}
      >
        {/* Left – page title */}
        <div className="flex items-center gap-3 pl-10 lg:pl-0 min-w-0">
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight truncate" style={{ color: "var(--text-primary)" }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] hidden sm:block leading-tight" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
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

          {/* User dropdown — now includes Settings, Notifications, Profile */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all"
              style={{
                backgroundColor: showDropdown ? "var(--accent-bg)" : "transparent",
                borderColor: showDropdown ? "var(--border-strong)" : "transparent",
              }}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${org.primaryColor}, ${org.primaryColor}bb)` }}
              >
                {userInitial}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold max-w-25 truncate leading-tight" style={{ color: "var(--text-primary)" }}>
                  {user.email?.split("@")[0] ?? "User"}
                </p>
                <p className="text-[10px] capitalize leading-tight" style={{ color: "var(--text-muted)" }}>{role}</p>
              </div>
              <ChevronDown
                size={13}
                className={cn("transition-transform duration-200 hidden sm:block", showDropdown && "rotate-180")}
                style={{ color: "var(--icon-default)" }}
              />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] w-60 border rounded-2xl shadow-xl py-1.5 z-50"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}
              >
                {/* User info */}
                <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${org.primaryColor}, ${org.primaryColor}bb)` }}
                  >
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{user.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: org.primaryColor }} />
                      <p className="text-[10px] capitalize font-medium truncate" style={{ color: "var(--text-muted)" }}>{org.name} · {role}</p>
                    </div>
                  </div>
                </div>

                {/* Links */}
                <div className="py-1">
                  {dropdownLinks.map(({ href, icon: Icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors dropdown-item"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <Icon size={14} style={{ color: "var(--icon-default)" }} />
                      {label}
                    </Link>
                  ))}
                </div>

                {/* Role badge + sign out */}
                <div className="px-4 py-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={12} style={{ color: "var(--icon-default)" }} />
                    <span className="text-[11px] capitalize" style={{ color: "var(--text-muted)" }}>{role} access</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ backgroundColor: "var(--status-danger-bg)", color: "var(--status-danger)" }}
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>

                <style>{`
                  .dropdown-item:hover {
                    background-color: var(--accent-bg);
                    color: var(--text-primary);
                  }
                  .dropdown-item:hover svg {
                    color: var(--icon-hover) !important;
                  }
                `}</style>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Expiry banner */}
      {showBanner && (
        <div
          className="flex items-center gap-3 px-4 py-2 border-b text-xs"
          style={{
            backgroundColor: isExpired ? "var(--status-danger-bg)" : "var(--status-warning-bg)",
            borderColor: "var(--border)",
          }}
        >
          <AlertTriangle size={13} className="shrink-0" style={{ color: isExpired ? "var(--status-danger)" : "var(--status-warning)" }} />
          <p className="flex-1" style={{ color: isExpired ? "var(--status-danger)" : "var(--status-warning)" }}>
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
