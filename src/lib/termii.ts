

const TERMII_BASE_URL = "https://v3.api.termii.com";

// Characters that drop per-page limit from 160 → 70 chars (doubles cost)
const SPECIAL_CHARS_REGEX = /[;/^{}\\[\]~|€'"]/g;

export interface SmsSendResult {
  success: boolean;
  channel?: string;
  messageId?: string;
  error?: string;
  devMode?: boolean;
}

/** Normalise any Nigerian phone variant → 234XXXXXXXXXX */
export function normalisePhone(raw: string): string {
  let p = raw.replace(/[\s\-()+.]/g, "");
  if (p.startsWith("0") && p.length === 11) p = "234" + p.slice(1);
  if (p.startsWith("234") && p.length === 13) return p;
  if (!p.startsWith("234") && p.length === 10) return "234" + p;
  return p;
}

/** Strip special chars, trim to 160 chars = 1 SMS unit ≈ ₦3-5 */
export function sanitiseMessage(msg: string): string {
  return msg.replace(SPECIAL_CHARS_REGEX, "").slice(0, 160);
}

/**
 * Send an SMS. Tries DND first (transactional route — best for attendance alerts),
 * falls back to generic.
 * DND requires activation on your Termii account — contact Termii support or
 * go to Dashboard → Sender IDs → Request DND Route.
 */
export async function sendSms(
  phone: string,
  message: string
): Promise<SmsSendResult> {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID ?? "Attendy";

  if (!apiKey) {
    console.log(`[SMS DEV] → ${phone} | ${message}`);
    return { success: true, devMode: true };
  }

  const to = normalisePhone(phone);
  const sms = sanitiseMessage(message);

  // DND first (transactional — delivers to all numbers including DND-registered),
  // generic fallback (promotional — blocked by DND, MTN 8PM-8AM restriction)
  const channels = ["dnd", "generic"] as const;

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

  return {
    success: false,
    error:
      "All channels failed — check Termii balance, sender ID approval, and API key.",
  };
}

// ─── High-level message builders ──────────────────────────────────────────

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

export function buildRegistrationMessage(
  studentName: string,
  studentClass: string,
  schoolName: string,
  parentPortalUrl: string
): string {
  return (
    `Attendy: ${studentName} (${studentClass}) registered at ` +
    `${schoolName}. Track attendance: ${parentPortalUrl}`
  );
}