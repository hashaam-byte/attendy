import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug || slug.length < 2)
    return NextResponse.json({ exists: false }, { status: 400 });

  const { data } = await service
    .from("organisations")
    .select("id, name, is_active, industry, plan_expires_at")
    .eq("slug", slug.toLowerCase().trim())
    .eq("industry", "education")
    .single();

  if (!data) {
    return NextResponse.json(
      { exists: false },
      {
        status: 404,
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
      }
    );
  }

  const isExpired =
    data.plan_expires_at && new Date(data.plan_expires_at) < new Date();

  return NextResponse.json(
    {
      exists: true,
      name: data.name,
      suspended: !data.is_active,
      expired: isExpired ?? false,
    },
    {
      // Cache successful org lookups for 5 minutes — org names/status rarely change
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    }
  );
}