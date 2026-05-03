"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark",  label: "Dark",  icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return (
    <div className="h-8 w-24 rounded-lg bg-green-100 dark:bg-green-950/30 animate-pulse" />
  );

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-lg bg-green-50 dark:bg-green-950/30 border border-[#bbf7d0] dark:border-[#1a3a24]">
      {themes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          aria-label={`${label} mode`}
          className={cn(
            "flex items-center justify-center rounded-md transition-all duration-150",
            compact ? "w-7 h-7" : "w-8 h-8",
            theme === value
              ? "bg-white dark:bg-green-700 text-green-700 dark:text-white shadow-sm"
              : "text-slate-400 dark:text-green-600 hover:text-green-600 dark:hover:text-green-300"
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}