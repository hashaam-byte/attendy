// src/lib/notify.ts — ATTENDY-EDU v4
// Unified notification sender.
// When org.whatsapp_enabled = true → tries Termii WhatsApp channel first.
// Falls back to SMS if WhatsApp fails or is unavailable.
// Code is built now; activates automatically when Termii approves WhatsApp.

export interface NotifyOptions {
  to:        string;   // phone number
  message:   string;
  orgId:     string;
  useWhatsApp?: boolean;  // from org.whatsapp_enabled
}

export interface NotifyResult {
  ok:        boolean;
  channel:   "whatsapp" | "sms";
  messageId?: string;
  error?:    string;
}

function normalisePhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("234")) return d;
  if (d.startsWith("0") && d.length === 11) return "234" + d.slice(1);
  return d;
}

async function sendTermii(
  to:      string,
  message: string,
  channel: "generic" | "dnd" | "whatsapp"
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey    = process.env.TERMII_API_KEY;
  const senderId  = process.env.TERMII_SENDER_ID ?? "Attendy";
  const baseUrl   = process.env.TERMII_BASE_URL  ?? "https://v3.api.termii.com";

  if (!apiKey) {
    console.warn(`[NOTIFY] TERMII_API_KEY is not set. Message NOT sent. channel=${channel} to=${to} | ${message}`);
    return { ok: false, error: "TERMII_API_KEY not configured — message not sent" };
  }

  const endpoint = channel === "whatsapp"
    ? `${baseUrl}/api/sms/otp/send/whatsapp`  // Termii WhatsApp endpoint
    : `${baseUrl}/api/sms/send`;

  const body = channel === "whatsapp"
    ? {
        api_key:   apiKey,
        to,
        from:      senderId,
        sms:       message.slice(0, 1000),
        type:      "plain",
        channel:   "whatsapp",
      }
    : {
        api_key:   apiKey,
        to,
        from:      senderId,
        sms:       message.slice(0, 160),
        type:      "plain",
        channel,
      };

  let res: Response;
  let rawText: string;

  try {
    res     = await fetch(endpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    rawText = await res.text();
  } catch (networkErr: any) {
    return { ok: false, error: `Network error: ${networkErr.message}` };
  }

  let data: any;
  try { data = JSON.parse(rawText); } catch { data = {}; }

  if (!res.ok || data?.code === "error") {
    const errMsg = [
      `Termii ${channel} error`,
      `HTTP ${res.status}`,
      data?.message ? `"${data.message}"` : null,
    ].filter(Boolean).join(" | ");
    console.error(`[NOTIFY ERROR] to=${to} channel=${channel} | ${errMsg}`);
    return { ok: false, error: errMsg };
  }

  console.log(`[NOTIFY OK] to=${to} channel=${channel} messageId=${data?.message_id}`);
  return { ok: true, messageId: data?.message_id };
}

export async function sendNotification(opts: NotifyOptions): Promise<NotifyResult> {
  const phone = normalisePhone(opts.to);

  // Try WhatsApp first if org has it enabled
  if (opts.useWhatsApp) {
    const waResult = await sendTermii(phone, opts.message, "whatsapp");
    if (waResult.ok) {
      return { ok: true, channel: "whatsapp", messageId: waResult.messageId };
    }
    // WhatsApp failed → fall through to SMS
    console.warn(`[NOTIFY] WhatsApp failed for ${phone}, falling back to SMS. Error: ${waResult.error}`);
  }

  // SMS fallback — try DND first, then generic
  const dndResult = await sendTermii(phone, opts.message, "dnd");
  if (dndResult.ok) {
    return { ok: true, channel: "sms", messageId: dndResult.messageId };
  }

  const genericResult = await sendTermii(phone, opts.message, "generic");
  return {
    ok:        genericResult.ok,
    channel:   "sms",
    messageId: genericResult.messageId,
    error:     genericResult.ok ? undefined : genericResult.error,
  };
}