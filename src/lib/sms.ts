// SERVER ONLY

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
    console.log(`[SMS DEV] To: ${to} | Message: ${message}`);
    return { ok: true, messageId: "dev-mode" };
  }

  const phone = normalisePhone(to);

  try {
    const res = await fetch("https://v3.api.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        to: phone,
        from: senderId,
        sms: message.slice(0, 160),
        type: "plain",
        channel: "dnd",
      }),
    });

    const data = await res.json();

    if (!res.ok || data.code === "error") {
      // Fallback to generic channel
      const res2 = await fetch("https://v3.api.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          to: phone,
          from: senderId,
          sms: message.slice(0, 160),
          type: "plain",
          channel: "generic",
        }),
      });
      const data2 = await res2.json();
      if (!res2.ok || data2.code === "error") {
        return { ok: false, error: data2.message ?? "Termii error" };
      }
      return { ok: true, messageId: data2.message_id };
    }

    return { ok: true, messageId: data.message_id };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
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