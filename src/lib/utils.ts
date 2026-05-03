import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: string | null): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy, HH:mm");
}

export function formatTime(date: string | null): string {
  if (!date) return "—";
  return format(new Date(date), "hh:mm a");
}

export function timeAgo(date: string | null): string {
  if (!date) return "Never";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-NG").format(n);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function isLate(scannedAt: string, startTime: string, gracePeriodMinutes: number): boolean {
  const scanned = new Date(scannedAt);
  const [hours, minutes] = startTime.split(":").map(Number);
  const cutoff = new Date(scanned);
  cutoff.setHours(hours, minutes + gracePeriodMinutes, 0, 0);
  return scanned > cutoff;
}

export function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  return digits;
}

export function getAttendancePct(present: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
}