"use client";
// src/components/layout/slug-topbar.tsx — ATTENDY-EDU v3

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogOut, User, GraduationCap, AlertTriangle } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { OrgContextValue } from "@/context/org-context";
import Image from "next/image";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  students: "Students",
  classes: "Classes",
  scanner: "Gate Scanner",
  absent: "Absent Today",
  reports: "Reports",
  notifications: "Notifications",
  settings: "Settings",
  "qr-cards": "QR Cards",
};

interface Props {
  user: SupabaseUser;
  org: OrgContextValue;
  role: string;
  slug: string;
}

export function SlugTopbar({ user, org, role, slug }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Determine page title from pathname segment after slug
  const segments = pathname.split("/").filter(Boolean);
  const pageKey = segments[1] ?? "dashboard";
  const title = PAGE_TITLES[pageKey] ?? "Attendy";

  // Plan expiry warning
  const planExpiringSoon = org.planExpiresAt
    ? new Date(org.planExpiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push(`/${slug}/login`);
    router.refresh();
  }

  return (
    <>
      <header className="h-14 shrink-0 flex items-center justify-between px-4 lg:px-6 border-b border-[#bbf7d0] dark:border-[#1a3a24] bg-white dark:bg-[#0c1a12]">
        {/* Title */}
        <div className="flex items-center gap-3 pl-10 lg:pl-0">
          <h1 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h1>

          {/* School name badge */}
          <span
            className="hidden sm:flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border"
            style={{
              backgroundColor: `${org.primaryColor}15`,
              borderColor: `${org.primaryColor}40`,
              color: org.primaryColor,
            }}
          >
            {org.logoUrl ? (
              <Image
                src={org.logoUrl}
                alt={org.name}
                width={14}
                height={14}
                className="rounded-sm object-contain"
              />
            ) : (
              <GraduationCap size={11} />
            )}
            {org.name}
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <ThemeToggle compact />

          <div className="flex items-center gap-2 pl-3 border-l border-[#bbf7d0] dark:border-[#1a3a24]">
            <div className="hidden sm:flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${org.primaryColor}20` }}
              >
                <User size={13} style={{ color: org.primaryColor }} />
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-medium text-slate-700 dark:text-green-200 max-w-[120px] truncate">
                  {user.email}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-[#4a7a5a] capitalize">{role}</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Plan expiry warning banner */}
      {planExpiringSoon && (
        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800/40">
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Your school plan expires soon. Contact Attendy to renew and keep your data safe.
          </p>
        </div>
      )}
    </>
  );
}