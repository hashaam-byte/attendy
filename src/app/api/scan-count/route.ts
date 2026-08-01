// src/app/api/scan-count/route.ts — ATTENDY-EDU
// Returns the total number of public scans for the landing-page live counter.
// Uses the get_public_scan_count RPC for a consistent public query path.
//   • revalidate = 300 (5 min) — consistent with the client's 5-min poll
//   • Cache-Control: s-maxage=300, stale-while-revalidate=600 — CDN serves
//     stale while revalidating, so most visitors pay zero DB cost

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 300; // 5 minutes (was 60 — unnecessarily aggressive)

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await anon.rpc("get_public_scan_count");

    if (error) {
      console.error("scan-count error:", error.message);
      return NextResponse.json({ count: 0 });
    }

    const count = typeof data === "number"
      ? data
      : Array.isArray(data)
      ? data[0]?.count ?? 0
      : (data as any)?.count ?? 0;

    return NextResponse.json(
      { count },
      {
        headers: {
          // 5 min fresh, serve stale for up to 10 min while revalidating.
          // Matches the client-side poll interval so they stay in sync.
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("scan-count unexpected:", err);
    return NextResponse.json({ count: 0 });
  }
}