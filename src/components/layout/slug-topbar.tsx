"use client";
// src/components/layout/slug-topbar.tsx — ATTENDY-EDU v4
// CHANGES: Subscription expiry banner now shows WhatsApp + Email buttons
// instead of generic text. Also shows notices count badge on Notices nav link.

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  LogOut, User, GraduationCap, AlertTriangle,
  MessageCircle, Mail,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { OrgContextValue } from "@/context/org-context";
import Image from "next/image";
import { cn, formatDate } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  dashboard:  "Dashboard",
  students:   "Students",
  classes:    "Classes",
  scanner:    "Gate Scanner",
  absent:     "Absent Today",
  reports:    "Reports",
  notifications: "Notifications",
  settings:   "Settings",
  "qr-cards": "QR Cards",
  notices:    "School Notices",
  excuses:    "Excuse Requests",
  "my-class": "My Class",
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

  const segments = pathname.split("/").filter(Boolean);
  const pageKey  = segments[1] ?? "dashboard";
  const title    = PAGE_TITLES[pageKey] ?? "Attendy";

  const planExpiresAt    = org.planExpiresAt ? new Date(org.planExpiresAt) : null;
  const now              = new Date();
  const daysLeft         = planExpiresAt
    ? Math.ceil((planExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpired        = daysLeft !== null && daysLeft < 0;
  const isExpiringSoon   = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  const showBanner       = isExpired || isExpiringSoon;

  const waMessage = encodeURIComponent(
    `Hi Attendy, I need to renew the subscription for ${org.name} (${org.slug}). Please assist.`
  );
  const waLink    = `https://wa.me/2348077291745?text=${waMessage}`;
  const mailLink  = `mailto:attendyofficial@gmail.com?subject=Subscription Renewal – ${org.name}&body=Hi, I need to renew the subscription for ${org.name} (ID: ${org.slug}).`;

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

          <span
            className="hidden sm:flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border"
            style={{
              backgroundColor: `${org.primaryColor}15`,
              borderColor:     `${org.primaryColor}40`,
              color:           org.primaryColor,
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

        {/* Right */}
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

      {/* ── Expiry banner ── */}
      {showBanner && (
        <div className={cn(
          "flex items-center gap-3 px-4 py-2.5 border-b",
          isExpired
            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40"
            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40"
        )}>
          <AlertTriangle
            size={14}
            className={cn(
              "shrink-0",
              isExpired ? "text-red-500" : "text-amber-500"
            )}
          />
          <p className={cn(
            "text-xs flex-1",
            isExpired ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"
          )}>
            {isExpired
              ? `Your school plan expired on ${formatDate(org.planExpiresAt)}. Some features may be limited.`
              : `Your school plan expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} (${formatDate(org.planExpiresAt)}). Renew to keep full access.`
            }
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                isExpired
                  ? "bg-red-600 hover:bg-red-700 border-red-600 text-white"
                  : "bg-amber-500 hover:bg-amber-600 border-amber-500 text-white"
              )}
            >
              <MessageCircle size={11} />
              WhatsApp
            </a>
            <a
              href={mailLink}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-[#bbf7d0] dark:border-[#1a3a24] text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 transition-all"
            >
              <Mail size={11} />
              Email
            </a>
          </div>
        </div>
      )}
    </>
  );
}