// src/app/api/reports/export/route.ts — ATTENDY-EDU v4
// Generates CSV exports with late count + late fee for Standard plan and above.
// Query params:
//   ?type=daily|weekly|term
//   &org_id=...
//   &start=YYYY-MM-DD
//   &end=YYYY-MM-DD

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupa = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function esc(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

const LATE_FEE_PLANS = ["standard", "premium", "enterprise"];

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || orgUser.role !== "admin") {
    return new NextResponse("Admin only", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type  = searchParams.get("type") ?? "daily";
  const start = searchParams.get("start") ?? new Date().toISOString().split("T")[0];
  const end   = searchParams.get("end")   ?? new Date().toISOString().split("T")[0];

  const orgId = orgUser.organisation_id;

  // Fetch org settings for late fee
  const { data: org } = await adminSupa
    .from("organisations")
    .select("name, plan, settings")
    .eq("id", orgId)
    .single();

  const settings        = (org?.settings as any) ?? {};
  const lateFeeEnabled  = settings.late_fee_enabled === true;
  const lateFeeAmount   = Number(settings.late_fee_amount ?? 0);
  const hasFeeFeature   = LATE_FEE_PLANS.includes(org?.plan ?? "");
  const showFee         = lateFeeEnabled && hasFeeFeature && lateFeeAmount > 0;

  // Fetch students
  const { data: students } = await adminSupa
    .from("members")
    .select("id, full_name, class_name, employee_id, parent_phone")
    .eq("organisation_id", orgId)
    .eq("member_type", "student")
    .eq("is_active", true)
    .order("class_name")
    .order("full_name");

  // Fetch attendance logs in range
  const { data: logs } = await adminSupa
    .from("attendance_logs")
    .select("member_id, status, scanned_at, scan_type")
    .eq("organisation_id", orgId)
    .eq("scan_type", "entry")
    .gte("scanned_at", `${start}T00:00:00`)
    .lte("scanned_at", `${end}T23:59:59`);

  // Term logs for accumulated late fee
  let termLogs: typeof logs = logs;
  if (type === "term" && settings.term_start_date) {
    const { data: tl } = await adminSupa
      .from("attendance_logs")
      .select("member_id, status, scanned_at, scan_type")
      .eq("organisation_id", orgId)
      .eq("scan_type", "entry")
      .gte("scanned_at", `${settings.term_start_date}T00:00:00`)
      .lte("scanned_at", `${end}T23:59:59`);
    termLogs = tl;
  }

  // Weekly late reset: count only Mon-Sun of same week
  function getWeekStart(dateStr: string): string {
    const d   = new Date(dateStr);
    const day = d.getDay(); // 0=Sun
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split("T")[0];
  }

  // Build per-student stats
  type StudentStat = {
    full_name:    string;
    class_name:   string | null;
    employee_id:  string | null;
    parent_phone: string | null;
    present:      number;
    late:         number;
    excused:      number;
    absent:       number;
    // fees
    late_this_week: number;
    late_this_term: number;
    fee_this_week:  number;
    fee_this_term:  number;
  };

  const stats: Record<string, StudentStat> = {};

  (students ?? []).forEach((s) => {
    stats[s.id] = {
      full_name:    s.full_name,
      class_name:   s.class_name,
      employee_id:  s.employee_id,
      parent_phone: s.parent_phone,
      present:  0,
      late:     0,
      excused:  0,
      absent:   0,
      late_this_week: 0,
      late_this_term: 0,
      fee_this_week:  0,
      fee_this_term:  0,
    };
  });

  const weekStart = getWeekStart(new Date().toISOString().split("T")[0]);

  (logs ?? []).forEach((l) => {
    const stat = stats[l.member_id];
    if (!stat) return;
    if (l.status === "present") stat.present++;
    else if (l.status === "late") {
      stat.late++;
      // Count late this week (for weekly fee reset)
      if (l.scanned_at.split("T")[0] >= weekStart) {
        stat.late_this_week++;
      }
    }
    else if (l.status === "excused") stat.excused++;
  });

  // Term late count from full term logs
  (termLogs ?? []).forEach((l) => {
    const stat = stats[l.member_id];
    if (!stat) return;
    if (l.status === "late") stat.late_this_term++;
  });

  // Calculate fees
  Object.values(stats).forEach((s) => {
    s.fee_this_week = showFee ? s.late_this_week * lateFeeAmount : 0;
    s.fee_this_term = showFee ? s.late_this_term * lateFeeAmount : 0;
  });

  // Total school days in range (approx)
  const schoolDays = Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  Object.values(stats).forEach((s) => {
    s.absent = Math.max(0, schoolDays - s.present - s.late - s.excused);
  });

  // Build CSV
  const feeHeaders = showFee
    ? [",Late This Week,Fee This Week (₦),Late This Term,Fee This Term (₦)"]
    : [];

  const headers = [
    "Student Name",
    "Class",
    "Student ID",
    "Present Days",
    "Late Days",
    "Excused Days",
    "Absent Days",
    "Attendance %",
    ...(showFee ? ["Late This Week", "Fee This Week (₦)", "Late This Term", "Fee This Term (₦)"] : []),
  ].map(esc).join(",");

  const rows = Object.values(stats).map((s) => {
    const total  = s.present + s.late + s.excused + s.absent;
    const pct    = total > 0 ? Math.round(((s.present + s.late + s.excused) / Math.max(schoolDays, 1)) * 100) : 0;
    const base   = [
      esc(s.full_name),
      esc(s.class_name),
      esc(s.employee_id),
      esc(s.present),
      esc(s.late),
      esc(s.excused),
      esc(s.absent),
      esc(`${pct}%`),
    ];
    if (showFee) {
      base.push(
        esc(s.late_this_week),
        esc(s.fee_this_week),
        esc(s.late_this_term),
        esc(s.fee_this_term),
      );
    }
    return base.join(",");
  });

  const csv      = [headers, ...rows].join("\n");
  const filename = `attendance_${type}_${start}_to_${end}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}