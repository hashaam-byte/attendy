/**
 * termii.ts — Single source-of-truth for all Termii SMS sending in Attendy.
 *
 * KEY FIXES vs the old inline helpers:
 *  1. Correct base URL: https://api.ng.termii.com  (no trailing slash)
 *  2. Try "generic" FIRST — works out-of-the-box with any Termii account.
 *     "dnd" requires manual activation by Termii support; most new accounts
 *     don't have it, which is why every send was silently failing.
 *  3. Strip ALL special characters that inflate cost (;/^{}\\[]~|€'"`)
 *     and keep messages ≤ 160 chars so each SMS costs 1 unit (~₦3-5).
 *  4. Robust phone normalisation (handles 0812…, +234812…, 234812…).
 *  5. Full structured response — callers can log or surface errors.
 */

const TERMII_BASE_URL = "https://api.ng.termii.com";

// Characters that drop the per-page limit from 160 → 70 chars (costs 2× units)
const SPECIAL_CHARS_REGEX = /[;/^{}\\[\]~|€'"]/g;

export interface SmsSendResult {
  success: boolean;
  channel?: string;
  messageId?: string;
  error?: string;
  devMode?: boolean;
}

/**
 * Normalise any Nigerian phone variant to international format: 234XXXXXXXXXX
 */
export function normalisePhone(raw: string): string {
  let p = raw.replace(/[\s\-()+.]/g, "");
  if (p.startsWith("0") && p.length === 11) p = "234" + p.slice(1);
  if (p.startsWith("234") && p.length === 13) return p;
  // already international without leading 0 (e.g. entered as 7012345678)
  if (!p.startsWith("234") && p.length === 10) return "234" + p;
  return p; // return as-is — Termii will reject if invalid
}

/**
 * Sanitise message: strip special chars, trim to 160 chars (1 SMS unit).
 * Keeping messages short = ~₦3-5 per send instead of ₦6-10 for 2 units.
 */
export function sanitiseMessage(msg: string): string {
  return msg.replace(SPECIAL_CHARS_REGEX, "").slice(0, 160);
}

/**
 * Low-level single send. Tries "generic" first (no account setup needed),
 * then falls back to "dnd" if you have it activated.
 */
export async function sendSms(
  phone: string,
  message: string
): Promise<SmsSendResult> {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID ?? "Attendy";

  // Dev / test mode — no API key set
  if (!apiKey) {
    console.log(`[SMS DEV] → ${phone} | ${message}`);
    return { success: true, devMode: true };
  }

  const to = normalisePhone(phone);
  const sms = sanitiseMessage(message);

  // Try generic first (works immediately), then dnd (needs account activation)
  const channels = ["generic", "dnd"] as const;

  for (const channel of channels) {
    const payload = {
      api_key: apiKey,
      to,
      from: senderId,
      sms,
      type: "plain",
      channel,
    };

    try {
      const res = await fetch(`${TERMII_BASE_URL}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Termii returns 200 even on some errors, so check body
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.code === "ok") {
        return {
          success: true,
          channel,
          messageId: data.message_id ?? data.message_id_str,
        };
      }

      console.warn(
        `[SMS] channel=${channel} failed: ${data?.message ?? JSON.stringify(data)}`
      );
    } catch (err) {
      console.warn(`[SMS] channel=${channel} network error: ${err}`);
    }
  }

  return { success: false, error: "All channels failed — check Termii balance, sender ID, and API key." };
}

// ─── High-level helpers used by API routes ─────────────────────────────────

/** Called after a student is scanned in (entry). */
export function buildScanMessage(
  studentName: string,
  studentClass: string,
  isLate: boolean,
  time: string,
  lateReason?: string
): string {
  if (isLate) {
    const reason = lateReason ? `. Reason: ${lateReason}` : "";
    return `Attendy: ${studentName} arrived LATE at ${time}${reason}.`;
  }
  return `Attendy: ${studentName} (${studentClass}) arrived safely at ${time}.`;
}

/** Called when a student is first registered. */
export function buildRegistrationMessage(
  studentName: string,
  studentClass: string,
  schoolName: string,
  parentPortalUrl: string
): string {
  // Keep short to stay within 160 chars
  return (
    `Attendy: ${studentName} (${studentClass}) registered at ` +
    `${schoolName}. Track attendance: ${parentPortalUrl}`
  );
}