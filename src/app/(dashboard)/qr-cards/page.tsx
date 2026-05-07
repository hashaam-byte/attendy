// src/app/(dashboard)/qr-cards/page.tsx — ATTENDY-EDU
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { QRCardsClient } from "./qr-cards-client";

export const dynamic = "force-dynamic";

export default async function QRCardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) redirect("/login");
  const orgId = orgUser.organisation_id;

  const [{ data: students }, { data: org }] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, class_name, qr_code, employee_id, is_active")
      .eq("organisation_id", orgId)
      .eq("member_type", "student")
      .eq("is_active", true)
      .order("class_name")
      .order("full_name"),
    supabase
      .from("organisations")
      .select("name, primary_color")
      .eq("id", orgId)
      .single(),
  ]);

  return (
    <QRCardsClient
      students={students ?? []}
      schoolName={org?.name ?? "School"}
      primaryColor={org?.primary_color ?? "#16a34a"}
    />
  );
}