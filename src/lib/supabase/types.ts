export type Role = 'admin' | 'teacher' | 'gateman' | 'parent'

export interface UserProfile {
  id: string
  user_id: string
  school_id: string
  full_name: string
  phone: string | null
  role: Role
  is_active: boolean
  app_prompt_dismissed: boolean
}

export interface School {
  id: string
  name: string
  slug: string
  is_active: boolean
  plan: string
  plan_expires_at: string | null
  max_students: number
  max_teachers: number
  max_parents: number
}

export interface Student {
  id: string
  school_id: string
  full_name: string
  class: string
  parent_name: string | null
  parent_phone: string
  qr_code: string
  photo_url: string | null
  is_active: boolean
  created_at: string
}

export interface AttendanceLog {
  id: string
  student_id: string
  school_id: string
  scan_type: 'entry' | 'exit'
  scanned_at: string
  is_late: boolean
  late_reason: string | null
  scanned_by: string
  scanned_by_role: 'teacher' | 'gateman'
  scanned_by_name: string
  students?: { full_name: string; class: string }
}