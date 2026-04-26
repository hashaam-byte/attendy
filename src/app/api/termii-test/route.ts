// src/app/api/termii-test/route.ts
// Updated to use the shared lib/termii.ts helper so the test page reflects
// exactly what the production routes do.

import { NextRequest, NextResponse } from "next/server";
import { sendSms, normalisePhone, sanitiseMessage } from "@/lib/termii";

export async function POST(req: NextRequest) {
  const { phone, message } = await req.json();

  if (!phone || !message) {
    return NextResponse.json(
      { success: false, error: "phone and message are required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID ?? "Attendy";

  const debug = {
    timestamp: new Date().toISOString(),
    env: {
      TERMII_API_KEY: apiKey
        ? `SET (${apiKey.length} chars, starts: ${apiKey.slice(0, 6)}...)`
        : "NOT SET ❌",
      TERMII_SENDER_ID: senderId,
    },
    phone_raw: phone,
    phone_normalised: normalisePhone(phone),
    message_raw: message,
    message_sanitised: sanitiseMessage(message),
    message_length: sanitiseMessage(message).length,
  };

  const result = await sendSms(phone, message);

  if (result.devMode) {
    return NextResponse.json({
      success: true,
      dev_mode: true,
      message: "DEV MODE — no API key set. SMS would have been sent.",
      debug,
    });
  }

  if (result.success) {
    return NextResponse.json({
      success: true,
      channel_used: result.channel,
      message_id: result.messageId,
      message: `SMS sent successfully via channel: ${result.channel}`,
      debug,
    });
  }

  return NextResponse.json(
    {
      success: false,
      error: result.error,
      diagnosis: buildDiagnosis(phone, apiKey),
      debug,
    },
    { status: 500 }
  );
}

function buildDiagnosis(phone: string, apiKey?: string): string[] {
  const hints: string[] = [];
  if (!apiKey) hints.push("❌ TERMII_API_KEY is not set in your .env.local");
  if (!phone.replace(/\D/g, "").startsWith("234"))
    hints.push("⚠️ Phone should start with 234 (Nigerian international format)");
  if (hints.length === 0) {
    hints.push(
      "1. Check your Termii dashboard for balance — top up if zero.",
      "2. Verify your Sender ID is approved (Settings → Sender IDs).",
      "3. Make sure your API key is correct (Dashboard → API Keys).",
      "4. If generic channel fails, contact support@termii.com to activate DND route."
    );
  }
  return hints;
}