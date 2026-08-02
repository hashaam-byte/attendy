import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "attendy_parent_session";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes, matches old client TTL

export interface ParentSessionPayload {
  phone: string;
  studentIds: string[];
  exp: number; // epoch ms
}

function secret(): string {
  const s = process.env.PARENT_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) {
    throw new Error(
      "PARENT_SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY as fallback) is not set — cannot sign parent sessions."
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createParentSessionToken(phone: string, studentIds: string[]): string {
  const payload: ParentSessionPayload = {
    phone,
    studentIds,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifyParentSessionToken(token: string | undefined | null): ParentSessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ParentSessionPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (!Array.isArray(payload.studentIds)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const PARENT_SESSION_COOKIE = COOKIE_NAME;
export const PARENT_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;