export type MemberRole = "admin" | "teacher" | "gateman" | "viewer";
export type MemberType = "student" | "staff" | "employee" | "contractor" | "guest" | "visitor";
export type AttendanceStatus = "present" | "late" | "early_exit" | "excused";
export type PlanType = "trial" | "basic" | "standard" | "premium" | "enterprise";
export type NotificationStatus = "sent" | "delivered" | "failed" | "pending";

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  industry: string;
  plan: PlanType;
  is_active: boolean;
  plan_expires_at: string | null;
  logo_url: string | null;
  primary_color: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  max_members: number;
  sms_sender_id: string | null;
  whatsapp_enabled: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface OrgUser {
  id: string;
  user_id: string;
  organisation_id: string;
  role: MemberRole;
  is_active: boolean;
  created_at: string;
}

export interface Member {
  id: string;
  organisation_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: MemberRole;
  member_type: MemberType;
  qr_code: string;
  employee_id: string | null;
  department: string | null;
  class_name: string | null;
  parent_phone: string | null;
  is_active: boolean;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceLog {
  id: string;
  organisation_id: string;
  member_id: string;
  scanned_by: string | null;
  scan_type: "entry" | "exit" | "class";
  status: AttendanceStatus;
  late_reason: string | null;
  device_id: string | null;
  scanned_at: string;
  members?: Pick<Member, "id" | "full_name" | "class_name" | "parent_phone" | "photo_url">;
}

export interface NotificationLog {
  id: string;
  organisation_id: string;
  member_id: string | null;
  channel: "sms" | "whatsapp" | "email";
  recipient: string;
  message: string;
  status: NotificationStatus;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string;
}

export interface SchoolSettings {
  start_time: string;       // e.g. "07:30"
  grace_period: number;     // minutes
  school_days: number[];    // [1,2,3,4,5]
  sms_on_arrival: boolean;
  sms_on_absence: boolean;
  absence_sms_time: string; // e.g. "09:00"
  welfare_consecutive_days: number;
  arrival_sms_template: string;
  absence_sms_template: string;
  whatsapp_enabled: boolean;
}

export const PLAN_LIMITS: Record<PlanType, { members: number; sms: number }> = {
  trial:      { members: 30,    sms: 100    },
  basic:      { members: 100,   sms: 500    },
  standard:   { members: 300,   sms: 2000   },
  premium:    { members: 1000,  sms: 10000  },
  enterprise: { members: 99999, sms: 999999 },
};

export const DEFAULT_SETTINGS: SchoolSettings = {
  start_time: "07:30",
  grace_period: 15,
  school_days: [1, 2, 3, 4, 5],
  sms_on_arrival: true,
  sms_on_absence: true,
  absence_sms_time: "09:00",
  welfare_consecutive_days: 3,
  arrival_sms_template: "Hello {parent_name}, your child {student_name} arrived at {school_name} at {time}.",
  absence_sms_template: "Hello {parent_name}, your child {student_name} has not been scanned at {school_name} today. Please contact the school.",
  whatsapp_enabled: false,
};