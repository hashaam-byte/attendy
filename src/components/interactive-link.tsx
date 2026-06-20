"use client";

import Link from "next/link";
import React from "react";

type Props = {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  children: React.ReactNode;
};

export default function InteractiveLink({ href, className, style, color, children }: Props) {
  function handleEnter(e: React.MouseEvent<HTMLElement>) {
    const el = e.currentTarget as HTMLElement;
    if (color) {
      el.style.borderColor = `${color}40`;
      el.style.backgroundColor = `${color}08`;
    } else {
      el.style.backgroundColor = "var(--accent-bg)";
    }
  }

  function handleLeave(e: React.MouseEvent<HTMLElement>) {
    const el = e.currentTarget as HTMLElement;
    if (style?.borderColor) el.style.borderColor = style.borderColor as string;
    else el.style.borderColor = "var(--border)";
    if (style?.backgroundColor) el.style.backgroundColor = style.backgroundColor as string;
    else el.style.backgroundColor = "var(--bg-card)";
  }

  return (
    <Link href={href} className={className} style={style} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
    </Link>
  );
}
