"use client";
// src/context/org-context.tsx — ATTENDY-EDU v3
// Provides school org data + settings to all pages under /[slug]/

import { createContext, useContext, type ReactNode } from "react";

export interface OrgSettings {
  start_time: string;           // "07:30"
  grace_period_minutes: number; // 15
  school_days: number[];        // [1,2,3,4,5]
  sms_on_arrival: boolean;
  sms_on_absence: boolean;
  absence_alert_time: string;   // "09:00"
  welfare_alert_days: number;   // 3
  late_fee_enabled: boolean;
  late_fee_amount: number;
  term_start_date: string | null;
  term_end_date: string | null;
  school_name_on_card: boolean;
  whatsapp_notifications: boolean;
}

export interface OrgContextValue {
  id: string;
  name: string;
  slug: string;
  plan: string;
  planExpiresAt: string | null;
  logoUrl: string | null;
  primaryColor: string;
  maxMembers: number;
  settings: Partial<OrgSettings>;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children, value }: { children: ReactNode; value: OrgContextValue }) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}

// Helper: compute whether a scan is late based on org settings
export function isLateScan(scannedAt: Date, settings: Partial<OrgSettings>): boolean {
  const startTime = settings.start_time || "07:30";
  const grace = settings.grace_period_minutes ?? 15;
  const [h, m] = startTime.split(":").map(Number);

  const cutoff = new Date(scannedAt);
  cutoff.setHours(h, m + grace, 0, 0);

  return scannedAt > cutoff;
}

// Helper: get today's cutoff time string for display
export function getCutoffDisplay(settings: Partial<OrgSettings>): string {
  const startTime = settings.start_time || "07:30";
  const grace = settings.grace_period_minutes ?? 15;
  const [h, m] = startTime.split(":").map(Number);
  const totalMins = h * 60 + m + grace;
  const ch = Math.floor(totalMins / 60);
  const cm = totalMins % 60;
  const period = ch >= 12 ? "PM" : "AM";
  const displayH = ch > 12 ? ch - 12 : ch;
  return `${displayH}:${String(cm).padStart(2, "0")} ${period}`;
}