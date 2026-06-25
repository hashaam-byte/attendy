// src/app/api/scan-count/route.ts — ATTENDY-EDU
// Returns the total number of rows in attendance_logs for the landing-page
// live counter.  Matches the attendy-web marketing site approach:
//   • Direct .select("*", { count: "exact", head: true }) — no RPC needed
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
    const { count, error } = await anon
      .from("attendance_logs")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("scan-count error:", error.message);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json(
      { count: count ?? 0 },
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