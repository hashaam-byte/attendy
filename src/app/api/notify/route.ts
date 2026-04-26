// src/app/api/notify/route.ts
// Replaces the old inline sendSMS helper with the shared lib/termii.ts utility.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSms, buildScanMessage } from "@/lib/termii";

export async function POST(req: NextRequest) {
  const { studentId, isLate, reason, time, attendanceId } = await req.json();

  if (!studentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("full_name, parent_phone, class, school_id")
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const { data: settings } = await supabase
    .from("school_settings")
    .select("sms_enabled")
    .eq("school_id", student.school_id)
    .single();

  if (!settings?.sms_enabled) {
    return NextResponse.json({ skipped: true, reason: "sms_disabled" });
  }

  const message = buildScanMessage(
    student.full_name,
    student.class,
    isLate,
    time ?? new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
    reason
  );

  const result = await sendSms(student.parent_phone, message);

  // Log result
  const logEntry: Record<string, unknown> = {
    school_id: student.school_id,
    student_id: studentId,
    channel: "sms",
    phone: student.parent_phone,
    message,
    status: result.success ? "sent" : "failed",
    error_message: result.error ?? null,
  };
  if (attendanceId) logEntry.attendance_id = attendanceId;

  await supabase.from("notifications_log").insert(logEntry);

  return NextResponse.json({
    success: result.success,
    channel: result.channel,
    dev_mode: result.devMode ?? false,
    error: result.error,
  });
}