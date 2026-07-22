// supabase/functions/send-push/index.ts — ATTENDY-EDU
// Deno edge function — uses ESM URLs, NOT npm package names.
// Sends Expo push notifications to parents and staff.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getEnv = (n: string): string => Deno.env.get(n) ?? "";

const supabase = createClient(
  getEnv("SUPABASE_URL"),
  getEnv("SUPABASE_SERVICE_ROLE_KEY")
);

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to: string; title: string; body: string;
  data?: Record<string, unknown>; sound: "default";
  channelId?: string;
}

async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(chunk),
      });
      const result = await res.json();
      console.log("[PUSH] Expo response:", JSON.stringify(result));
    } catch (err) {
      console.error("[PUSH] Expo request failed:", err);
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: any;
  try { body = await req.json(); }
  catch { return new Response("Invalid JSON", { status: 400 }); }

  const { type, org_id, title, body: msgBody, data, target, member_id } = body;
  if (!org_id || !title || !msgBody || !target) return new Response("Missing fields", { status: 400 });

  const tokens: string[] = [];

  if (target === "parent" && member_id) {
    const { data: rows } = await supabase
      .from("parent_push_tokens")
      .select("expo_push_token")
      .eq("member_id", member_id)
      .eq("push_enabled", true)
      .not("expo_push_token", "is", null);
    (rows ?? []).forEach((r: any) => tokens.push(r.expo_push_token));

  } else if (target === "admins" || target === "teachers") {
    const roleFilter = target === "admins" ? ["admin"] : ["admin", "teacher"];
    const { data: rows } = await supabase
      .from("org_users")
      .select("expo_push_token")
      .eq("organisation_id", org_id)
      .eq("is_active", true)
      .eq("push_enabled", true)
      .in("role", roleFilter)
      .not("expo_push_token", "is", null);
    (rows ?? []).forEach((r: any) => tokens.push(r.expo_push_token));
  }

  if (tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  const channelId = type === "excuse_request" ? "attendy-excuse" : "attendy-attendance";
  const messages: PushMessage[] = tokens.map((token) => ({
    to: token, title, body: msgBody, sound: "default",
    data: { type, org_id, member_id, ...data }, channelId,
  }));

  await sendExpoPush(messages);

  return new Response(
    JSON.stringify({ sent: messages.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});