"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogOut, User, GraduationCap } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const pageTitles: Record<string, string> = {
  "/dashboard":     "Dashboard",
  "/students":      "Students",
  "/classes":       "Classes",
  "/scanner":       "Gate Scanner",
  "/reports":       "Reports",
  "/notifications": "Notifications",
  "/settings":      "Settings",
};

export function Topbar({
  user,
  schoolName,
  role,
}: {
  user: SupabaseUser;
  schoolName: string;
  role: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const title =
    Object.entries(pageTitles).find(([key]) =>
      pathname === key || pathname.startsWith(key + "/")
    )?.[1] ?? "Attendy Edu";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 lg:px-6 border-b border-[#bbf7d0] dark:border-[#1a3a24] bg-white dark:bg-[#0c1a12]">
      {/* Title — offset for mobile hamburger */}
      <div className="flex items-center gap-3 pl-10 lg:pl-0">
        <h1 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h1>
        {schoolName && (
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 px-2 py-0.5 rounded-full">
            <GraduationCap size={11} />
            {schoolName}
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <ThemeToggle compact />

        <div className="flex items-center gap-2 pl-3 border-l border-[#bbf7d0] dark:border-[#1a3a24]">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <User size={13} className="text-green-700 dark:text-green-400" />
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
  );
}