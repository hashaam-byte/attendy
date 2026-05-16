// src/app/api/scan-count/route.ts — ATTENDY-EDU
// Called by the landing page live scan counter.
// Uses anon key (public, read-only RPC).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 60; // Cache for 60s

export async function GET() {
  const { data, error } = await anon.rpc("get_total_scan_count");
  if (error) return NextResponse.json({ count: 0 });
  return NextResponse.json(
    { count: data ?? 0 },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}