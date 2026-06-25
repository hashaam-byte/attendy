// src/app/api/termii-check/route.ts — ATTENDY-EDU v5
// Admin-only endpoint that checks Termii configuration:
//   1. API key validity + account balance
//   2. Registered sender IDs
//   3. Optionally sends a ₦0-cost "test" to a provided number
//
// Hit from Settings → Notifications → "Test SMS" button.
// Returns a structured JSON result so the UI can show exactly
// what's wrong (wrong API key, zero balance, unregistered sender ID,
// DND blocking, etc.).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || orgUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const apiKey    = process.env.TERMII_API_KEY;
  const senderId  = process.env.TERMII_SENDER_ID ?? "Attendy";
  const baseUrl   = process.env.TERMII_BASE_URL ?? "https://v3.api.termii.com";

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      issue: "NO_API_KEY",
      message: "TERMII_API_KEY environment variable is not set. Add it to your Vercel project environment variables.",
      balance: null,
      sender_id: senderId,
    });
  }

  // ── 1. Check balance ──────────────────────────────────────────
  let balance: number | null = null;
  let balanceError: string | null = null;
  try {
    const res  = await fetch(`${baseUrl}/api/get-balance?api_key=${apiKey}`, { method: "GET" });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}

    if (!res.ok || data?.code === "error") {
      balanceError = `HTTP ${res.status}: ${data?.message ?? text.slice(0, 120)}`;
    } else {
      balance = data?.data?.balance ?? data?.balance ?? null;
    }
  } catch (e: any) {
    balanceError = `Network error: ${e.message}`;
  }

  // ── 2. Check sender IDs ───────────────────────────────────────
  let senderIds: string[] = [];
  let senderIdError: string | null = null;
  try {
    const res  = await fetch(`${baseUrl}/api/sender-id?api_key=${apiKey}`, { method: "GET" });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}
    if (res.ok && (data?.content || data?.data)) {
      // Termii v3 API returns { content: [...] } — older docs showed { data: [...] }
      // We support both shapes. Only count sender IDs that are "active" (not pending/blocked).
      const list: any[] = data?.content ?? data?.data ?? [];
      senderIds = list
        .filter((s: any) => !s?.status || s?.status === "active")
        .map((s: any) => s?.sender_id ?? "");
    } else {
      senderIdError = `HTTP ${res.status}: ${data?.message ?? text.slice(0, 80)}`;
    }
  } catch (e: any) {
    senderIdError = `Network error: ${e.message}`;
  }

  const senderIdRegistered = senderIds.includes(senderId);

  // ── 3. Diagnose ───────────────────────────────────────────────
  type Issue =
    | "LOW_BALANCE"
    | "SENDER_ID_UNREGISTERED"
    | "BALANCE_CHECK_FAILED"
    | "OK"
    | "API_ERROR";

  let issue: Issue = "OK";
  let message = "Termii configuration looks good. SMS should be working.";
  const tips: string[] = [];

  if (balanceError) {
    issue = "API_ERROR";
    message = `Could not connect to Termii: ${balanceError}`;
    tips.push("Check your TERMII_API_KEY is correct (no extra spaces).");
    tips.push("The Termii API base URL in use is: " + baseUrl);
  } else if (balance !== null && balance < 5) {
    issue = "LOW_BALANCE";
    message = `Your Termii balance is ₦${balance}. DND-route SMS costs ~₦3–4 per message. You need at least ₦5 to send one SMS.`;
    tips.push("Top up at https://termii.com to send more SMS.");
    tips.push("With ₦5, you may only get 1–2 messages before balance runs out.");
  }

  if (!senderIdRegistered && !senderIdError) {
    if (issue === "OK") issue = "SENDER_ID_UNREGISTERED";
    message = `Sender ID "${senderId}" is not registered in your Termii account. ` +
      `Registered IDs: [${senderIds.join(", ") || "none found"}]. ` +
      `SMS will fail until you register this sender ID.`;
    tips.push(`Register "${senderId}" as a sender ID at https://termii.com/sender-ids`);
    tips.push(`Or change TERMII_SENDER_ID to one of your registered IDs: ${senderIds.join(", ") || "(none yet)"}`);
  }

  return NextResponse.json({
    ok: issue === "OK",
    issue,
    message,
    balance,
    balance_error: balanceError,
    sender_id: senderId,
    sender_id_registered: senderIdRegistered,
    registered_sender_ids: senderIds,
    sender_id_error: senderIdError,
    tips,
    api_key_set: true,
    api_key_prefix: apiKey.slice(0, 8) + "…",
  });
}

// POST — sends a real test SMS to a provided phone number
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || orgUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { to } = body;
  if (!to) return NextResponse.json({ error: "Missing `to` phone number" }, { status: 400 });

  const apiKey   = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID ?? "Attendy";
  const baseUrl  = process.env.TERMII_BASE_URL ?? "https://v3.api.termii.com";

  if (!apiKey) return NextResponse.json({ ok: false, error: "TERMII_API_KEY not set" });

  const phone = to.replace(/\D/g, "");
  const normalised = phone.startsWith("234") ? phone : phone.startsWith("0") ? "234" + phone.slice(1) : phone;

  const message = `Attendy test: SMS is working correctly! Sent at ${new Date().toLocaleTimeString("en-NG")}.`;

  try {
    const res  = await fetch(`${baseUrl}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        to:      normalised,
        from:    senderId,
        sms:     message,
        type:    "plain",
        channel: "dnd",
      }),
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}

    if (!res.ok || data?.code === "error") {
      return NextResponse.json({
        ok:    false,
        error: `${data?.message ?? text.slice(0, 200)}`,
        http_status: res.status,
        full_response: data,
        tip: data?.message?.toLowerCase().includes("balance")
          ? "Your Termii balance is too low. Top up at https://termii.com."
          : data?.message?.toLowerCase().includes("sender")
          ? `Your sender ID "${senderId}" may not be approved. Check https://termii.com/sender-ids`
          : null,
      });
    }

    return NextResponse.json({ ok: true, message_id: data?.message_id, to: normalised });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: `Network error: ${e.message}` });
  }
}