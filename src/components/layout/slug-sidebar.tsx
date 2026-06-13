"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LayoutDashboard, Users, BookOpen, ScanLine, BarChart3,
  Bell, Settings, X, Menu, GraduationCap, UserX, QrCode,
  CheckSquare, Megaphone, FileCheck, ChevronDown,
} from "lucide-react";

type NavItem = {
  label:   string;
  href:    string;
  icon:    React.ElementType;
  badge?:  string;
};

type NavGroup = {
  title?: string;
  items:  NavItem[];
};

function buildNavGroups(slug: string, role: string): NavGroup[] {
  if (role === "gateman") {
    return [{
      items: [
        { label: "Scanner",  href: `/${slug}/scanner`,  icon: ScanLine },
        { label: "Notices",  href: `/${slug}/notices`,  icon: Megaphone },
        { label: "Settings", href: `/${slug}/settings`, icon: Settings },
      ],
    }];
  }

  if (role === "teacher") {
    return [
      {
        title: "Overview",
        items: [
          { label: "Dashboard",  href: `/${slug}/dashboard`,        icon: LayoutDashboard },
          { label: "Notices",    href: `/${slug}/notices`,           icon: Megaphone },
        ],
      },
      {
        title: "Classroom",
        items: [
          { label: "My Class",        href: `/${slug}/my-class`,         icon: BookOpen },
          { label: "Class Register",  href: `/${slug}/my-class/confirm`, icon: CheckSquare },
          { label: "Scanner",         href: `/${slug}/scanner`,          icon: ScanLine },
        ],
      },
      {
        title: "Account",
        items: [
          { label: "Settings", href: `/${slug}/settings`, icon: Settings },
        ],
      },
    ];
  }

  // admin
  return [
    {
      title: "Overview",
      items: [
        { label: "Dashboard",       href: `/${slug}/dashboard`,    icon: LayoutDashboard },
        { label: "Notices",         href: `/${slug}/notices`,      icon: Megaphone },
      ],
    },
    {
      title: "Students",
      items: [
        { label: "All Students",    href: `/${slug}/students`,     icon: Users },
        { label: "Absent Today",    href: `/${slug}/absent`,       icon: UserX },
        { label: "QR Cards",        href: `/${slug}/qr-cards`,     icon: QrCode },
        { label: "Classes",         href: `/${slug}/classes`,      icon: BookOpen },
      ],
    },
    {
      title: "Attendance",
      items: [
        { label: "Scanner",         href: `/${slug}/scanner`,      icon: ScanLine },
        { label: "Reports",         href: `/${slug}/reports`,      icon: BarChart3 },
        { label: "Excuse Requests", href: `/${slug}/excuses`,      icon: FileCheck },
      ],
    },
    {
      title: "Admin",
      items: [
        { label: "Notifications",   href: `/${slug}/notifications`, icon: Bell },
        { label: "Settings",        href: `/${slug}/settings`,      icon: Settings },
      ],
    },
  ];
}

interface Props {
  slug:         string;
  role:         string;
  orgName:      string;
  primaryColor: string;
}

function NavContent({ slug, role, orgName, primaryColor, onClose }: Props & { onClose?: () => void }) {
  const pathname = usePathname();
  const groups   = buildNavGroups(slug, role);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a1912]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#d1f0dc] dark:border-[#162e1f]">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
        >
          <GraduationCap size={18} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#0d1f14] dark:text-[#e4f5ec] leading-tight truncate">
            {orgName}
          </p>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: primaryColor }}
          >
            {role}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "pt-3" : ""}>
            {group.title && (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#7aab8a] dark:text-[#4a7a5a]">
                {group.title}
              </p>
            )}
            {group.items.map(({ label, href, icon: Icon, badge }) => {
              const isActive =
                href === `/${slug}/dashboard`
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + "/");

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
                    isActive
                      ? "text-white shadow-sm"
                      : "text-[#2e5c3e] dark:text-[#9ecfae] hover:bg-[#edfaf2] dark:hover:bg-[rgba(15,45,28,0.4)] hover:text-[#0d1f14] dark:hover:text-white"
                  )}
                  style={isActive ? {
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                    boxShadow: `0 2px 8px ${primaryColor}40`,
                  } : {}}
                >
                  <Icon
                    size={15}
                    className={cn(
                      "shrink-0 transition-all",
                      isActive ? "text-white" : "text-[#5a9a6e] dark:text-[#6b9e7a] group-hover:text-[#1a9e50] dark:group-hover:text-[#2ec467]"
                    )}
                  />
                  <span className="truncate">{label}</span>
                  {badge && (
                    <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#d1f0dc] dark:border-[#162e1f]">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: primaryColor }}
          />
          <p className="text-[10px] text-[#7aab8a] dark:text-[#4a7a5a] font-medium">
            Attendy Edu · Live
          </p>
        </div>
      </div>
    </div>
  );
}

export function SlugSidebar({ slug, role, orgName, primaryColor }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-[#d1f0dc] dark:border-[#162e1f] h-full shadow-sm">
        <NavContent slug={slug} role={role} orgName={orgName} primaryColor={primaryColor} />
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white dark:bg-[#0d1e17] border border-[#d1f0dc] dark:border-[#162e1f] shadow-md"
      >
        <Menu size={17} className="text-[#1a9e50]" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 border-r border-[#d1f0dc] dark:border-[#162e1f] shadow-2xl transform transition-transform duration-250",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#edfaf2] dark:hover:bg-[rgba(15,45,28,0.4)] text-[#7aab8a] z-10"
        >
          <X size={15} />
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