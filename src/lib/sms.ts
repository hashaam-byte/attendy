// src/lib/sms.ts — ATTENDY-EDU
// SERVER ONLY — never import in client components.
// Updated with full Termii error logging: HTTP status, error code, response body.

interface SmsResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

function normalisePhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("234")) return d;
  if (d.startsWith("0") && d.length === 11) return "234" + d.slice(1);
  return d;
}

export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID ?? "Attendy";

  if (!apiKey) {
    console.warn(`[SMS] TERMII_API_KEY is not set. Message NOT sent. To: ${to} | Message: ${message}`);
    return { ok: false, error: "TERMII_API_KEY not configured — message not sent" };
  }

  const phone = normalisePhone(to);

  async function attempt(channel: "dnd" | "generic"): Promise<SmsResult> {
    let res: Response;
    let rawText: string;

    try {
      res = await fetch("https://v3.api.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          to: phone,
          from: senderId,
          sms: message.slice(0, 160),
          type: "plain",
          channel,
        }),
      });
      rawText = await res.text();
    } catch (networkErr: any) {
      const msg = `Termii network error (${channel}): ${networkErr.message}`;
      console.error(`[SMS ERROR] ${msg}`);
      return { ok: false, error: msg };
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    if (!res.ok || data?.code === "error") {
      const errMsg = [
        `Termii error (${channel})`,
        `HTTP ${res.status}`,
        data?.code ? `code=${data.code}` : null,
        data?.message ? `message="${data.message}"` : null,
        data?.description ? `desc="${data.description}"` : null,
      ].filter(Boolean).join(" | ");

      console.error(`[SMS ERROR] to=${phone} | ${errMsg}`);
      console.error(`[SMS ERROR] Full response body:`, rawText);
      return { ok: false, error: errMsg };
    }

    console.log(`[SMS OK] to=${phone} channel=${channel} messageId=${data?.message_id}`);
    return { ok: true, messageId: data?.message_id };
  }

  // Try DND first (registered sender IDs bypass DND), fall back to generic
  const result = await attempt("dnd");
  if (!result.ok) {
    console.warn(`[SMS] DND channel failed, trying generic…`);
    return await attempt("generic");
  }
  return result;
}

export function buildArrivalSms(opts: {
  parentName: string;
  studentName: string;
  schoolName: string;
  time: string;
  isLate: boolean;
  template?: string;
}): string {
  const { parentName, studentName, schoolName, time, isLate, template } = opts;
  const status = isLate ? "LATE" : "safely";
  const base = template ?? "Hello {parent_name}, your child {student_name} arrived {status} at {school_name} at {time}.";
  return base
    .replace("{parent_name}", parentName)
    .replace("{student_name}", studentName)
    .replace("{school_name}", schoolName)
    .replace("{time}", time)
    .replace("{status}", status);
}

export function buildAbsenceSms(opts: {
  parentName: string;
  studentName: string;
  schoolName: string;
  template?: string;
}): string {
  const { parentName, studentName, schoolName, template } = opts;
  const base = template ?? "Hello {parent_name}, your child {student_name} has not been scanned at {school_name} today.";
  return base
    .replace("{parent_name}", parentName)
    .replace("{student_name}", studentName)
    .replace("{school_name}", schoolName);
}