"use client";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { GraduationCap, Sun, Moon, Monitor, Menu, X } from "lucide-react";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const options: { value: string; icon: typeof Sun; label: string }[] = [
    { value: "light",  icon: Sun,     label: "Light" },
    { value: "dark",   icon: Moon,    label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div className="atd-theme-toggle" role="radiogroup" aria-label="Theme">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mounted && theme === value}
          aria-label={label}
          title={label}
          className={`atd-theme-btn ${mounted && theme === value ? "atd-theme-btn-active" : ""}`}
          onClick={() => setTheme(value)}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}

export function LandingNav({ onStaffLoginClick }: { onStaffLoginClick: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile panel automatically if the viewport is resized
  // past the mobile breakpoint (e.g. rotating a tablet to landscape).
  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 768) setMobileNavOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function closeAnd(fn?: () => void) {
    setMobileNavOpen(false);
    fn?.();
  }

  return (
    <>
      <nav className={`atd-nav ${scrolled ? "atd-nav-scrolled" : ""}`}>
        <div className="atd-nav-inner">
          <div className="atd-nav-logo">
            <div className="atd-nav-icon">
              <GraduationCap size={16} color="#fff" />
            </div>
            <span className="atd-nav-wordmark">Attendy</span>
            <span className="atd-nav-pill">Edu</span>
          </div>

          <div className="atd-nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a href="/portal">Parent Portal</a>
          </div>

          <div className="atd-nav-actions">
            <ThemeToggle />
            <button className="atd-nav-btn atd-nav-btn-desktop" onClick={onStaffLoginClick}>
              Staff Login
            </button>
            <button
              className="atd-nav-burger"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {/* Mobile nav panel — flexible, scrolls with its own content,
            not competing for space in the fixed top bar. Staff Login
            lives here (and only here) on small screens. */}
        <div className={`atd-mobile-panel ${mobileNavOpen ? "atd-mobile-panel-open" : ""}`}>
          <a href="#how" onClick={() => setMobileNavOpen(false)}>How it works</a>
          <a href="#features" onClick={() => setMobileNavOpen(false)}>Features</a>
          <a href="#pricing" onClick={() => setMobileNavOpen(false)}>Pricing</a>
          <a href="#faq" onClick={() => setMobileNavOpen(false)}>FAQ</a>
          <a href="/portal" onClick={() => setMobileNavOpen(false)}>Parent Portal</a>
          <a href="/download" onClick={() => setMobileNavOpen(false)}>Download App</a>
          <button className="atd-mobile-staff-btn" onClick={() => closeAnd(onStaffLoginClick)}>
            Staff Login
          </button>
        </div>
      </nav>

      <style>{`
        .atd-nav {
          position: sticky; top: 0; z-index: 30;
          background: transparent;
          border-bottom: 1px solid transparent;
          transition: background 0.25s ease, border-color 0.25s ease, backdrop-filter 0.25s ease;
        }
        .atd-nav-scrolled {
          background: rgba(var(--land-bg-rgb), 0.72);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(var(--land-fg-rgb), 0.08);
        }
        .atd-nav-inner {
          display: flex; align-items: center; justify-content: space-between;
          max-width: 1160px; margin: 0 auto; padding: 16px 24px;
        }
        .atd-nav-logo { display: flex; align-items: center; gap: 9px; }
        .atd-nav-icon {
          width: 30px; height: 30px; border-radius: 9px;
          background: #16a34a;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .atd-nav-wordmark {
          font-family: 'Bricolage Grotesque', system-ui, sans-serif;
          font-weight: 700; font-size: 17px;
          color: var(--land-text-solid);
        }
        .atd-nav-pill {
          font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em;
          padding: 2px 7px; border-radius: 100px;
          background: rgba(22,163,74,0.14); color: #4ade80;
        }
        .atd-nav-links {
          display: flex; align-items: center; gap: 26px;
        }
        .atd-nav-links a {
          text-decoration: none; font-size: 14px; font-weight: 500;
          color: rgba(var(--land-fg-rgb),0.68);
          transition: color 0.15s;
        }
        .atd-nav-links a:hover { color: #4ade80; }

        .atd-nav-actions { display: flex; align-items: center; gap: 10px; }
        .atd-nav-btn {
          font-size: 13.5px; font-weight: 600;
          padding: 8px 16px; border-radius: 9px;
          background: rgba(var(--land-fg-rgb),0.06);
          border: 1px solid rgba(var(--land-fg-rgb),0.1);
          color: var(--land-text-solid);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .atd-nav-btn:hover { background: rgba(var(--land-fg-rgb),0.1); }

        .atd-theme-toggle {
          display: flex; align-items: center; gap: 2px;
          padding: 3px; border-radius: 10px;
          background: rgba(var(--land-fg-rgb),0.05);
          border: 1px solid rgba(var(--land-fg-rgb),0.08);
        }
        .atd-theme-btn {
          display: flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 7px;
          background: transparent; border: none; cursor: pointer;
          color: rgba(var(--land-fg-rgb),0.45);
          transition: background 0.15s, color 0.15s;
        }
        .atd-theme-btn:hover { color: rgba(var(--land-fg-rgb),0.8); }
        .atd-theme-btn-active {
          background: rgba(22,163,74,0.16); color: #4ade80;
        }
        .atd-theme-btn-active:hover { color: #4ade80; }

        .atd-nav-burger {
          display: none;
          align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(var(--land-fg-rgb),0.05);
          border: 1px solid rgba(var(--land-fg-rgb),0.08);
          color: var(--land-text-solid);
          cursor: pointer;
        }

        .atd-mobile-panel {
          display: none;
          flex-direction: column;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 0.3s ease, opacity 0.25s ease, padding 0.3s ease;
          padding: 0 20px;
        }
        .atd-mobile-panel a {
          text-decoration: none;
          color: rgba(var(--land-fg-rgb),0.75);
          font-size: 14.5px;
          font-weight: 500;
          padding: 13px 4px;
          border-bottom: 1px solid rgba(var(--land-fg-rgb),0.07);
        }
        .atd-mobile-panel a:active { color: #4ade80; }
        .atd-mobile-staff-btn {
          margin: 12px 0 16px;
          padding: 11px 16px;
          border-radius: 10px;
          font-size: 14px; font-weight: 700;
          background: #16a34a; color: #fff;
          border: none; cursor: pointer;
        }

        @media(max-width:768px){
          .atd-nav-links { display: none; }
          .atd-nav-btn-desktop { display: none; }
          .atd-nav-burger { display: flex; }
          .atd-mobile-panel { display: flex; }
          .atd-mobile-panel-open {
            max-height: 420px;
            opacity: 1;
            padding: 6px 20px 16px;
          }
          .atd-nav-inner { padding: 14px 20px; }
        }
      `}</style>
    </>
  );
}