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
    <div className="h-8 w-24 rounded-lg animate-pulse" style={{ backgroundColor: "var(--accent-bg)" }} />
  );

  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-lg border"
      style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border)" }}
    >
      {themes.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            aria-label={`${label} mode`}
            className={cn(
              "flex items-center justify-center rounded-md transition-all duration-150",
              compact ? "w-7 h-7" : "w-8 h-8"
            )}
            style={{
              backgroundColor: isActive ? "var(--bg-card)" : "transparent",
              color: isActive ? "var(--accent)" : "var(--text-faint)",
              boxShadow: isActive ? "var(--shadow-sm)" : "none",
            }}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
