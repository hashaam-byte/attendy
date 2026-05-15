// src/app/[slug]/(dashboard)/absent/page.tsx — ATTENDY-EDU v3
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AbsentClient } from "./absent-client";

export const dynamic = "force-dynamic";

export default async function AbsentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/login`);

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();
  if (!orgUser) redirect(`/${slug}/login`);

  const orgId = orgUser.organisation_id;
  const today = new Date().toISOString().split("T")[0];

  const [{ data: allStudents }, { data: scannedToday }] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, class_name, parent_phone, employee_id")
      .eq("organisation_id", orgId)
      .eq("member_type", "student")
      .eq("is_active", true)
      .order("class_name")
      .order("full_name"),

    supabase
      .from("attendance_logs")
      .select("member_id")
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .gte("scanned_at", `${today}T00:00:00`),
  ]);

  const scannedIds = new Set((scannedToday ?? []).map((s) => s.member_id));
  const absentStudents = (allStudents ?? []).filter((s) => !scannedIds.has(s.id));

  return (
    <AbsentClient
      absentStudents={absentStudents}
      total={allStudents?.length ?? 0}
      orgId={orgId}
      role={orgUser.role}
      today={today}
      slug={slug}
    />
  );
}