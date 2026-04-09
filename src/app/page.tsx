import React from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --green: #16a34a;
    --green-light: #22c55e;
    --green-dim: rgba(22,163,74,0.12);
    --green-border: rgba(22,163,74,0.25);
    --bg: #080c0a;
    --bg-card: #0d1410;
    --bg-card2: #111a14;
    --border: rgba(255,255,255,0.07);
    --border-hover: rgba(255,255,255,0.14);
    --text: #f0f4f1;
    --muted: #6b7d72;
    --muted2: #4a5a50;
    --font-display: 'Bricolage Grotesque', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }

  html { scroll-behavior: smooth; }

  .attendy-root {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-display);
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
    position: relative;
  }

  .attendy-root::before {
    content: '';
    position: fixed; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none; z-index: 0; opacity: 0.5;
  }

  /* NAV */
  .nav-wrap {
    position: sticky; top: 0; z-index: 100;
    backdrop-filter: blur(20px) saturate(180%);
    background: rgba(8,12,10,0.85);
    border-bottom: 1px solid var(--border);
  }
  .nav-inner {
    max-width: 1200px; margin: 0 auto;
    padding: 0 2rem; height: 60px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .logo {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none; color: var(--text);
    font-weight: 700; font-size: 18px; letter-spacing: -0.3px;
  }
  .logo-icon {
    width: 32px; height: 32px;
    background: var(--green);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .nav-links { display: flex; align-items: center; gap: 6px; }
  .nav-link {
    color: var(--muted);
    text-decoration: none;
    font-size: 14px;
    padding: 6px 12px;
    border-radius: 6px;
    transition: color 0.15s, background 0.15s;
  }
  .nav-link:hover { color: var(--text); background: rgba(255,255,255,0.05); }
  .nav-cta {
    background: var(--green);
    color: #fff;
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 18px;
    border-radius: 8px;
    transition: background 0.15s, transform 0.1s;
    margin-left: 8px;
  }
  .nav-cta:hover { background: var(--green-light); transform: translateY(-1px); }

  /* HERO */
  .hero {
    position: relative;
    max-width: 1100px; margin: 0 auto;
    padding: 110px 2rem 100px;
    text-align: center;
    overflow: hidden;
    z-index: 1;
  }
  .hero-glow {
    position: absolute;
    top: -80px; left: 50%; transform: translateX(-50%);
    width: 700px; height: 500px;
    background: radial-gradient(ellipse at center, rgba(22,163,74,0.18) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 100%);
    pointer-events: none;
  }
  .badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--green-dim);
    border: 1px solid var(--green-border);
    color: #4ade80;
    font-size: 12px; font-weight: 500;
    padding: 6px 14px;
    border-radius: 100px;
    margin-bottom: 28px;
    letter-spacing: 0.3px;
  }
  .badge-dot {
    width: 6px; height: 6px;
    background: #4ade80;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .hero h1 {
    font-family: var(--font-display);
    font-size: clamp(2.6rem, 6vw, 4.8rem);
    font-weight: 700;
    line-height: 1.08;
    letter-spacing: -2px;
    margin-bottom: 24px;
    color: #fff;
    position: relative; z-index: 1;
  }
  .hero h1 em { color: var(--green-light); font-style: normal; }
  .hero-sub {
    font-size: 18px;
    color: var(--muted);
    max-width: 580px;
    margin: 0 auto 40px;
    line-height: 1.65;
    font-weight: 400;
    position: relative; z-index: 1;
  }
  .hero-actions {
    display: flex; align-items: center; justify-content: center;
    gap: 12px; flex-wrap: wrap;
    margin-bottom: 60px;
    position: relative; z-index: 1;
  }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--green);
    color: #fff;
    text-decoration: none;
    font-size: 15px; font-weight: 600;
    padding: 14px 28px;
    border-radius: 10px;
    transition: all 0.15s;
    letter-spacing: -0.2px;
    border: none; cursor: pointer;
  }
  .btn-primary:hover { background: var(--green-light); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(22,163,74,0.35); }
  .btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    background: transparent;
    color: var(--text);
    text-decoration: none;
    font-size: 15px; font-weight: 500;
    padding: 13px 24px;
    border-radius: 10px;
    border: 1px solid var(--border-hover);
    transition: all 0.15s;
    cursor: pointer;
  }
  .btn-ghost:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); }

  /* SMS DEMO */
  .sms-demo {
    display: inline-flex;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px 24px;
    text-align: left;
    gap: 14px;
    align-items: flex-start;
    max-width: 380px;
    margin: 0 auto;
    position: relative; z-index: 1;
  }
  .sms-icon {
    width: 36px; height: 36px; min-width: 36px;
    background: var(--green-dim);
    border: 1px solid var(--green-border);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .sms-label { font-size: 11px; color: var(--muted); font-family: var(--font-mono); margin-bottom: 4px; }
  .sms-text { font-size: 14px; color: var(--text); line-height: 1.5; }
  .sms-text strong { color: #fff; }
  .sms-time { font-size: 11px; color: var(--muted); font-family: var(--font-mono); margin-top: 6px; }

  /* STATS BAR */
  .stats-bar {
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    padding: 32px 2rem;
    position: relative; z-index: 1;
  }
  .stats-inner {
    max-width: 900px; margin: 0 auto;
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .stat { text-align: center; }
  .stat-num {
    font-size: 2.4rem; font-weight: 700;
    color: #fff; letter-spacing: -2px;
    line-height: 1; margin-bottom: 6px;
  }
  .stat-num span { color: var(--green-light); }
  .stat-label { font-size: 13px; color: var(--muted); }

  /* SHARED SECTION */
  .section { position: relative; z-index: 1; }
  .section-tag {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--green-light);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 14px;
  }
  .section-title {
    font-size: clamp(1.8rem, 3.5vw, 2.8rem);
    font-weight: 700;
    letter-spacing: -1.2px;
    color: #fff;
    line-height: 1.15;
    margin-bottom: 16px;
  }
  .section-sub { font-size: 17px; color: var(--muted); max-width: 520px; line-height: 1.65; }
  .container { max-width: 1100px; margin: 0 auto; padding: 0 2rem; }

  /* PROBLEM */
  .problem { padding: 100px 0; }
  .problem-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    margin-top: 60px;
  }
  .problem-card {
    background: var(--bg-card);
    padding: 36px 32px;
    transition: background 0.2s;
  }
  .problem-card:hover { background: var(--bg-card2); }
  .problem-emoji { font-size: 28px; margin-bottom: 20px; display: block; }
  .problem-title { font-size: 17px; font-weight: 600; color: #fff; margin-bottom: 10px; letter-spacing: -0.3px; }
  .problem-desc { font-size: 14px; color: var(--muted); line-height: 1.7; }

  /* HOW IT WORKS */
  .how { padding: 100px 0; }
  .steps {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 0;
    position: relative;
    margin-top: 70px;
  }
  .steps::before {
    content: '';
    position: absolute;
    top: 26px; left: calc(12.5% + 20px); right: calc(12.5% + 20px);
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--green-border), var(--green-border), transparent);
    z-index: 0;
  }
  .step { text-align: center; padding: 0 16px; position: relative; z-index: 1; }
  .step-num {
    width: 52px; height: 52px;
    background: var(--bg-card);
    border: 1px solid var(--green-border);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--green-light);
    font-weight: 500;
  }
  .step-title { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 10px; letter-spacing: -0.2px; }
  .step-desc { font-size: 13px; color: var(--muted); line-height: 1.65; }

  /* FEATURES */
  .features { padding: 100px 0; }
  .features-layout {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    margin-top: 60px;
  }
  .feat {
    background: var(--bg-card);
    padding: 36px;
    transition: background 0.2s;
    position: relative;
  }
  .feat:hover { background: var(--bg-card2); }
  .feat-wide { grid-column: span 2; }
  .feat-icon {
    width: 42px; height: 42px;
    background: var(--green-dim);
    border: 1px solid var(--green-border);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
  }
  .feat-title { font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 10px; letter-spacing: -0.3px; }
  .feat-desc { font-size: 14px; color: var(--muted); line-height: 1.7; }
  .feat-wide-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }

  /* PRICING */
  .pricing { padding: 100px 0; }
  .pricing-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 60px;
  }
  .plan {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px 28px;
    position: relative;
    transition: border-color 0.2s, transform 0.2s;
  }
  .plan:hover { border-color: var(--border-hover); transform: translateY(-3px); }
  .plan.featured {
    border-color: var(--green-border);
    background: linear-gradient(160deg, rgba(22,163,74,0.06) 0%, var(--bg-card) 60%);
  }
  .plan-badge {
    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    background: var(--green);
    color: #fff;
    font-size: 11px; font-weight: 700;
    padding: 4px 14px;
    border-radius: 100px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .plan-name { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  .plan-price { font-size: 2.4rem; font-weight: 700; color: #fff; letter-spacing: -2px; line-height: 1; margin-bottom: 4px; }
  .plan-period { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
  .plan-divider { height: 1px; background: var(--border); margin-bottom: 24px; }
  .plan-features { list-style: none; margin-bottom: 28px; display: flex; flex-direction: column; gap: 12px; }
  .plan-features li {
    display: flex; align-items: flex-start; gap: 10px;
    font-size: 14px; color: var(--muted); line-height: 1.4;
  }
  .plan-features li::before {
    content: '';
    width: 14px; height: 14px; min-width: 14px;
    margin-top: 2px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2322c55e' stroke-width='2.5'%3E%3Cpath d='M20 6L9 17l-5-5'/%3E%3C/svg%3E");
    background-size: contain; background-repeat: no-repeat;
  }
  .plan-btn {
    display: block; text-align: center;
    text-decoration: none; font-size: 14px; font-weight: 600;
    padding: 12px; border-radius: 8px; transition: all 0.15s;
  }
  .plan-btn-primary { background: var(--green); color: #fff; }
  .plan-btn-primary:hover { background: var(--green-light); }
  .plan-btn-ghost { background: transparent; color: var(--text); border: 1px solid var(--border-hover); }
  .plan-btn-ghost:hover { background: rgba(255,255,255,0.05); }
  .pricing-note { text-align: center; font-size: 13px; color: var(--muted2); margin-top: 20px; }

  /* WHO */
  .who { padding: 80px 0; }
  .who-tags { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 30px; }
  .who-tag {
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--muted);
    font-size: 14px;
    padding: 10px 18px;
    border-radius: 8px;
    transition: all 0.15s;
  }
  .who-tag:hover { border-color: var(--green-border); color: var(--text); }

  /* CTA */
  .cta-section {
    padding: 120px 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
    z-index: 1;
  }
  .cta-glow {
    position: absolute;
    bottom: -100px; left: 50%; transform: translateX(-50%);
    width: 600px; height: 400px;
    background: radial-gradient(ellipse at center, rgba(22,163,74,0.15) 0%, transparent 70%);
    pointer-events: none;
  }
  .cta-grid-line {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 100% at 50% 100%, black 0%, transparent 70%);
    pointer-events: none;
  }
  .cta-section h2 {
    font-size: clamp(2rem, 4vw, 3.6rem);
    font-weight: 700;
    letter-spacing: -1.5px;
    color: #fff;
    max-width: 700px;
    margin: 0 auto 20px;
    line-height: 1.1;
    position: relative; z-index: 1;
  }
  .cta-section p { font-size: 17px; color: var(--muted); max-width: 480px; margin: 0 auto 40px; position: relative; z-index: 1; }
  .cta-contacts {
    display: flex; justify-content: center; gap: 12px;
    flex-wrap: wrap; margin-top: 20px; position: relative; z-index: 1;
  }
  .contact-link {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13px; color: var(--muted);
    text-decoration: none; font-family: var(--font-mono);
    padding: 6px 14px;
    border: 1px solid var(--border);
    border-radius: 6px;
    transition: all 0.15s;
  }
  .contact-link:hover { color: var(--text); border-color: var(--border-hover); }

  /* FOOTER */
  .footer {
    border-top: 1px solid var(--border);
    padding: 32px 2rem;
    position: relative; z-index: 1;
  }
  .footer-inner {
    max-width: 1100px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
  }
  .footer-copy { font-size: 13px; color: var(--muted2); }
  .footer-links { display: flex; gap: 20px; }
  .footer-links a { font-size: 13px; color: var(--muted); text-decoration: none; transition: color 0.15s; font-family: var(--font-mono); }
  .footer-links a:hover { color: var(--text); }

  /* RESPONSIVE */
  @media (max-width: 768px) {
    .nav-link.hide-mobile { display: none; }
    .stats-inner { grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .problem-grid { grid-template-columns: 1fr; }
    .steps { grid-template-columns: repeat(2, 1fr); }
    .steps::before { display: none; }
    .features-layout { grid-template-columns: 1fr; }
    .feat-wide { grid-column: span 1; }
    .feat-wide-inner { grid-template-columns: 1fr; gap: 24px; }
    .pricing-grid { grid-template-columns: 1fr; }
  }

  /* ANIMATIONS */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-1 { animation: fadeUp 0.7s ease 0.1s both; }
  .fade-2 { animation: fadeUp 0.7s ease 0.2s both; }
  .fade-3 { animation: fadeUp 0.7s ease 0.3s both; }
  .fade-4 { animation: fadeUp 0.7s ease 0.4s both; }
  .fade-5 { animation: fadeUp 0.7s ease 0.5s both; }
`;

// ─── SVG ICONS ───────────────────────────────────────────────
const QRIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="17" y="17" width="4" height="4" rx="0.5" />
  </svg>
);

const QRIconGreen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" width="18" height="18">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="17" y="17" width="4" height="4" rx="0.5" />
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" width="18" height="18">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const MonitorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" width="18" height="18">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" width="18" height="18">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" width="18" height="18">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" width="18" height="18">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4l3 3" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const MailIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const CodeIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const SmsChatIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#4ade80" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

// ─── DATA ────────────────────────────────────────────────────
const problems = [
  {
    emoji: "📋",
    title: "Morning registers waste time",
    desc: "Teachers spend 10+ minutes calling names every morning. Errors happen. Registers get lost. There's no real audit trail.",
  },
  {
    emoji: "😰",
    title: "Parents are always guessing",
    desc: "A parent has no idea if their child actually made it to school until a concerned 2 PM phone call that interrupts everyone's day.",
  },
  {
    emoji: "🚪",
    title: "Gate security is a blind spot",
    desc: "Students slip in late, leave early, or get someone else to sign them in. No timestamp, no accountability — until something goes wrong.",
  },
];

const steps = [
  { num: "01", title: "Student gets a QR card", desc: "Register a student once and print their unique QR ID card in seconds. Done." },
  { num: "02", title: "Card scanned at the gate", desc: "The gateman or teacher scans the card using any Android or iPhone camera." },
  { num: "03", title: "System logs everything", desc: "Time-stamped. Marked present, late, or early departure. Dashboard updates instantly." },
  { num: "04", title: "Parent gets an SMS", desc: '"Amara arrived safely at 7:52 AM." Instantly — no manual steps, no delays.' },
];

const plans = [
  {
    name: "Basic",
    price: "₦120,000",
    period: "per year · up to 200 students",
    featured: false,
    badge: null,
    btnClass: "plan-btn-ghost",
    subject: "Interested in Attendy Basic",
    features: [
      "QR attendance scanning",
      "Instant SMS alerts",
      "Admin + gateman logins",
      "Live attendance dashboard",
      "Basic weekly reports",
    ],
  },
  {
    name: "Standard",
    price: "₦200,000",
    period: "per year · up to 500 students",
    featured: true,
    badge: "Most Popular",
    btnClass: "plan-btn-primary",
    subject: "Interested in Attendy Standard",
    features: [
      "Everything in Basic",
      "Teacher class logins",
      "Parent portal access",
      "Class-by-class reports",
      "Late cutoff overrides",
      "Late reason tracking",
    ],
  },
  {
    name: "Pro",
    price: "₦350,000",
    period: "per year · unlimited students",
    featured: false,
    badge: null,
    btnClass: "plan-btn-ghost",
    subject: "Interested in Attendy Pro",
    features: [
      "Everything in Standard",
      "WhatsApp alerts",
      "Custom SMS sender ID",
      "Export to Excel & PDF",
      "Priority support",
      "Multi-branch support",
    ],
  },
];

const schoolTypes = [
  "Private Primary Schools",
  "Secondary Schools",
  "Nursery & Crèche",
  "Faith-Based Schools",
  "International Schools",
  "Montessori Schools",
  "Boarding Schools",
];

// ─── COMPONENT ───────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <style>{styles}</style>
      <div className="attendy-root">

        {/* NAV */}
        <div className="nav-wrap">
          <div className="nav-inner">
            <a href="#" className="logo">
              <div className="logo-icon">
                <QRIcon />
              </div>
              Attendy
            </a>
            <div className="nav-links">
              <a href="#how" className="nav-link hide-mobile">How it works</a>
              <a href="#features" className="nav-link hide-mobile">Features</a>
              <a href="#pricing" className="nav-link hide-mobile">Pricing</a>
              <a href="mailto:attendyofficial@gmail.com?subject=Book a Demo" className="nav-link hide-mobile">Contact</a>
              <a
                href="mailto:attendyofficial@gmail.com?subject=I want to get started with Attendy"
                className="nav-cta"
              >
                Get Started →
              </a>
            </div>
          </div>
        </div>

        {/* HERO */}
        <section className="hero">
          <div className="hero-glow" />
          <div className="hero-grid" />

          <div className="badge fade-1">
            <span className="badge-dot" />
            Now live for Nigerian schools
          </div>

          <h1 className="fade-2">
            Know the moment your<br />
            student <em>walks through</em><br />
            the school gate.
          </h1>

          <p className="hero-sub fade-3">
            Attendy turns any smartphone into an attendance terminal. Scan, log, and instantly SMS parents — fully automated, zero manual effort.
          </p>

          <div className="hero-actions fade-4">
            <a
              href="mailto:attendyofficial@gmail.com?subject=I want to get started with Attendy"
              className="btn-primary"
            >
              Start for free <ArrowIcon />
            </a>
            <a
              href="mailto:attendyofficial@gmail.com?subject=Book a Demo"
              className="btn-ghost"
            >
              Book a demo
            </a>
          </div>

          <div className="sms-demo fade-5">
            <div className="sms-icon">
              <SmsChatIcon />
            </div>
            <div>
              <div className="sms-label">ATTENDY · SMS ALERT</div>
              <div className="sms-text">
                📍 Chidera Okafor arrived at Lagos Excellence Academy at{" "}
                <strong>7:52 AM</strong> — on time.
              </div>
              <div className="sms-time">Today · 07:52 AM · Delivered</div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <div className="stats-bar">
          <div className="stats-inner">
            <div className="stat">
              <div className="stat-num"><span>&lt;</span>3s</div>
              <div className="stat-label">Scan to SMS delivery time</div>
            </div>
            <div className="stat">
              <div className="stat-num">100<span>%</span></div>
              <div className="stat-label">Attendance accuracy</div>
            </div>
            <div className="stat">
              <div className="stat-num">0</div>
              <div className="stat-label">Hardware required</div>
            </div>
          </div>
        </div>

        {/* PROBLEM */}
        <section className="problem section">
          <div className="container">
            <span className="section-tag">The problem</span>
            <h2 className="section-title">Manual attendance is<br />failing your school.</h2>
            <p className="section-sub">
              Every school in Nigeria is still running on registers and phone calls. It&apos;s slow, inaccurate, and leaves parents completely in the dark.
            </p>
            <div className="problem-grid">
              {problems.map((p) => (
                <div className="problem-card" key={p.title}>
                  <span className="problem-emoji">{p.emoji}</span>
                  <div className="problem-title">{p.title}</div>
                  <div className="problem-desc">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="how section" id="how">
          <div className="container">
            <span className="section-tag">How it works</span>
            <h2 className="section-title">Four steps. Fully automated.</h2>
            <p className="section-sub">
              No new hardware. No complex setup. Just scan and go — your existing smartphones handle everything.
            </p>
            <div className="steps">
              {steps.map((s) => (
                <div className="step" key={s.num}>
                  <div className="step-num">{s.num}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="features section" id="features">
          <div className="container">
            <span className="section-tag">Features</span>
            <h2 className="section-title">Everything your school<br />actually needs.</h2>
            <div className="features-layout">
              <div className="feat">
                <div className="feat-icon"><QRIconGreen /></div>
                <div className="feat-title">QR Attendance Scanning</div>
                <div className="feat-desc">Fast, accurate scanning on any smartphone — no dedicated scanners needed. Works on budget Android phones too.</div>
              </div>
              <div className="feat">
                <div className="feat-icon"><ChatIcon /></div>
                <div className="feat-title">Instant SMS &amp; WhatsApp Alerts</div>
                <div className="feat-desc">Parents receive a notification the moment their child is scanned at the gate — on time, late, or early departure.</div>
              </div>
              <div className="feat">
                <div className="feat-icon"><MonitorIcon /></div>
                <div className="feat-title">Real-Time Dashboard</div>
                <div className="feat-desc">Live counts of present, absent, and late students. Updated every second. See your entire school at a glance.</div>
              </div>
              <div className="feat">
                <div className="feat-icon"><ShieldIcon /></div>
                <div className="feat-title">Role-Based Access</div>
                <div className="feat-desc">Admins, teachers, gatemen, and parents each have their own controlled view — no oversharing, no confusion.</div>
              </div>
              <div
                className="feat feat-wide"
                style={{ background: "linear-gradient(120deg, rgba(22,163,74,0.06), var(--bg-card))" }}
              >
                <div className="feat-wide-inner">
                  <div>
                    <div className="feat-icon"><UsersIcon /></div>
                    <div className="feat-title">Class Management &amp; Teacher Logins</div>
                    <div className="feat-desc">Assign teachers to classes so they only see their students. Each class gets its own attendance report — clean, private, contextual.</div>
                  </div>
                  <div>
                    <div className="feat-icon"><ClockIcon /></div>
                    <div className="feat-title">Late Reason Tracking &amp; Parent Reports</div>
                    <div className="feat-desc">When a student arrives late, teachers log the reason. Parents see it too — end-of-week reports go straight to their phone.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="pricing section" id="pricing">
          <div className="container">
            <span className="section-tag">Pricing</span>
            <h2 className="section-title">Simple, honest pricing.</h2>
            <p className="section-sub">
              Flat annual plans — no per-student fees, no surprise charges. Built for Nigerian school budgets.
            </p>
            <div className="pricing-grid">
              {plans.map((plan) => (
                <div className={`plan${plan.featured ? " featured" : ""}`} key={plan.name}>
                  {plan.badge && <div className="plan-badge">{plan.badge}</div>}
                  <div className="plan-name">{plan.name}</div>
                  <div className="plan-price">{plan.price}</div>
                  <div className="plan-period">{plan.period}</div>
                  <div className="plan-divider" />
                  <ul className="plan-features">
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <a
                    href={`mailto:attendyofficial@gmail.com?subject=${encodeURIComponent(plan.subject)}`}
                    className={`plan-btn ${plan.btnClass}`}
                  >
                    Get started
                  </a>
                </div>
              ))}
            </div>
            <p className="pricing-note">
              All plans include onboarding &amp; setup support. SMS charges billed separately via Termii.
            </p>
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section className="who section">
          <div className="container">
            <span className="section-tag">Built for</span>
            <h2 className="section-title">Made for every Nigerian school.</h2>
            <div className="who-tags">
              {schoolTypes.map((s) => (
                <span className="who-tag" key={s}>{s}</span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section section">
          <div className="cta-glow" />
          <div className="cta-grid-line" />
          <h2>Real-time visibility for every school gate in Nigeria.</h2>
          <p>Setup takes less than a day. No hardware. No IT department needed.</p>
          <a
            href="mailto:attendyofficial@gmail.com?subject=I want to get started with Attendy"
            className="btn-primary"
            style={{ display: "inline-flex" }}
          >
            Start using Attendy <ArrowIcon />
          </a>
          <div className="cta-contacts">
            <a href="mailto:attendyofficial@gmail.com" className="contact-link">
              <MailIcon />
              attendyofficial@gmail.com
            </a>
            <a href="mailto:hashcody63@gmail.com" className="contact-link">
              <CodeIcon />
              hashcody63@gmail.com · developer
            </a>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-inner">
            <a href="#" className="logo" style={{ fontSize: 15 }}>
              <div className="logo-icon" style={{ width: 26, height: 26 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" width="13" height="13">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="17" y="17" width="4" height="4" rx="0.5" />
                </svg>
              </div>
              Attendy
            </a>
            <p className="footer-copy">© {new Date().getFullYear()} Attendy. Built for Nigerian schools.</p>
            <div className="footer-links">
              <a href="mailto:attendyofficial@gmail.com">Support</a>
              <a href="mailto:hashcody63@gmail.com">Developer</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}