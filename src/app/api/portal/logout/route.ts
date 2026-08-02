import { NextResponse } from "next/server";
import { PARENT_SESSION_COOKIE } from "@/lib/parent-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PARENT_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}