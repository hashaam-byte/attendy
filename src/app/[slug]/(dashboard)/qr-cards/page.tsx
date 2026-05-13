// src/app/[slug]/qr-cards/page.tsx — ATTENDY-EDU v3
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import QRCardClient from "./qr-cards-client";

export const dynamic = "force-dynamic";

export default async function QRCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { slug } = await params;
  const { id } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/login`);

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();
  if (!orgUser) redirect(`/${slug}/login`);

  const [{ data: org }, { data: students }] = await Promise.all([
    supabase
      .from("organisations")
      .select("name, slug, logo_url, primary_color, settings")
      .eq("id", orgUser.organisation_id)
      .single(),
    supabase
      .from("members")
      .select("id, full_name, class_name, qr_code, employee_id, is_active, photo_url")
      .eq("organisation_id", orgUser.organisation_id)
      .eq("member_type", "student")
      .eq("is_active", true)
      .order("class_name")
      .order("full_name"),
  ]);

  // If specific student selected
  let selectedStudent = id ? (students ?? []).find((s) => s.id === id) : null;
  if (!selectedStudent && students && students.length > 0) {
    selectedStudent = students[0];
  }

  if (!selectedStudent) {
    return (
      <div className="max-w-md space-y-4">
        <h2 className="page-title">QR Card Designer</h2>
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-[#6b9e7a]">
            No active students found. Register students first.
          </p>
          <Link href={`/${slug}/students/register`} className="btn-primary mt-4 inline-flex">
            Register First Student
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link href={`/${slug}/students`} className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="page-title">QR Card Designer</h2>
          <p className="page-sub">
            {selectedStudent.full_name} · {selectedStudent.class_name ?? "No class"}
          </p>
        </div>
      </div>

      {/* Student selector */}
      {(students ?? []).length > 1 && (
        <div className="card p-4">
          <label className="block text-xs font-medium text-slate-600 dark:text-green-200 mb-2">
            Select student to preview card:
          </label>
          <select
            className="input-base max-w-xs"
            value={selectedStudent.id}
            onChange={(e) => {
              const url = new URL(window.location.href);
              url.searchParams.set("id", e.target.value);
              window.location.href = url.toString();
            }}
          >
            {(students ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} {s.class_name ? `· ${s.class_name}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <QRCardClient
        student={selectedStudent}
        schoolName={org?.name ?? "School"}
        schoolSlug={slug}
        studentId={selectedStudent.id}
      />
    </div>
  );
}