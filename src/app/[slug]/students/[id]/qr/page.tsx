import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QRCardClient } from "./qr-card-client";

export const dynamic = "force-dynamic";

export default async function QRCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) redirect("/login");

  const [{ data: student }, { data: org }] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, class_name, qr_code, employee_id, is_active")
      .eq("id", id)
      .eq("organisation_id", orgUser.organisation_id)
      .single(),

    supabase
      .from("organisations")
      .select("name, logo_url, primary_color")
      .eq("id", orgUser.organisation_id)
      .single(),
  ]);

  if (!student) notFound();

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/students/${id}`} className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="page-title">QR Card</h2>
          <p className="page-sub">{student.full_name}</p>
        </div>
      </div>

      <QRCardClient
        student={student}
        schoolName={org?.name ?? "School"}
        primaryColor={org?.primary_color ?? "#16a34a"}
      />
    </div>
  );
}