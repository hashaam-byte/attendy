// src/lib/plan-features.ts — ATTENDY-EDU v5
// Single source of truth for which features unlock at which plan tier.
// Used by: Settings (WhatsApp toggle, Quick Add, Export), API routes
// that enforce these server-side, and any UI that shows upgrade prompts.
//
// Tiers, low → high: trial, basic, standard, premium, enterprise

import type { PlanType } from "./types";

export interface PlanFeatures {
  whatsappNotifications: boolean; // send via WhatsApp (Termii) instead of/alongside SMS
  quickAddStudents:      boolean; // Vercel-style dynamic-row student entry
  studentExport:         boolean; // CSV export of student roster (for transfers)
  lateFees:              boolean; // late-fee tracking & reporting
  studentPhotos:         boolean; // photo upload on student profile / QR card
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  trial:      { whatsappNotifications: false, quickAddStudents: false, studentExport: false, lateFees: false, studentPhotos: false },
  basic:      { whatsappNotifications: false, quickAddStudents: false, studentExport: false, lateFees: false, studentPhotos: false },
  standard:   { whatsappNotifications: true,  quickAddStudents: false, studentExport: false, lateFees: true,  studentPhotos: false },
  premium:    { whatsappNotifications: true,  quickAddStudents: true,  studentExport: true,  lateFees: true,  studentPhotos: true  },
  enterprise: { whatsappNotifications: true,  quickAddStudents: true,  studentExport: true,  lateFees: true,  studentPhotos: true  },
};

export function getPlanFeatures(plan: string | null | undefined): PlanFeatures {
  return PLAN_FEATURES[(plan as PlanType) ?? "trial"] ?? PLAN_FEATURES.trial;
}

export function hasFeature(plan: string | null | undefined, feature: keyof PlanFeatures): boolean {
  return getPlanFeatures(plan)[feature];
}

// Friendly name for the minimum plan a feature requires — used in
// upgrade-prompt copy ("WhatsApp notifications require the Standard plan").
export function minPlanFor(feature: keyof PlanFeatures): string {
  const order: PlanType[] = ["trial", "basic", "standard", "premium", "enterprise"];
  const found = order.find((p) => PLAN_FEATURES[p][feature]);
  return found ? found[0].toUpperCase() + found.slice(1) : "Enterprise";
}
