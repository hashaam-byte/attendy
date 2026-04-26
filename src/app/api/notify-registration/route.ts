// src/app/api/notify-registration/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSms, buildRegistrationMessage } from "@/lib/termii";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { student_id, school_id } = await req.json();
  if (!student_id || !school_id) {
    return NextResponse.json(
      { error: "student_id and school_id required" },
      { status: 400 }
    );
  }

  const { data: settings } = await supabaseAdmin
    .from("school_settings")
    .select("sms_enabled")
    .eq("school_id", school_id)
    .single();

  if (!settings?.sms_enabled) {
    return NextResponse.json({ skipped: true, reason: "sms_disabled" });
  }

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("full_name, class, parent_phone")
    .eq("id", student_id)
    .eq("school_id", school_id)
    .single();

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const { data: school } = await supabaseAdmin
    .from("schools")
    .select("name, slug")
    .eq("id", school_id)
    .single();

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://attendy-edu.vercel.app";
  const parentPortalUrl = `${baseUrl}/${school?.slug ?? ""}/parent/login`;

  const message = buildRegistrationMessage(
    student.full_name,
    student.class,
    school?.name ?? "your school",
    parentPortalUrl
  );

  const result = await sendSms(student.parent_phone, message);

  await supabaseAdmin.from("notifications_log").insert({
    school_id,
    student_id,
    channel: "sms",
    phone: student.parent_phone,
    message,
    status: result.success ? "sent" : "failed",
    error_message: result.error ?? null,
  });

  return NextResponse.json({
    success: result.success,
    dev_mode: result.devMode ?? false,
    error: result.error,
  });
}