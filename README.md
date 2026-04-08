🧩 1. SYSTEM ARCHITECTURE
High-Level Flow
[ Mobile App / Web App ]
          │
          ▼
   [ Next.js Frontend ]
          │
          ▼
   [ Supabase Backend ]
   ├── Auth (users)
   ├── PostgreSQL (data)
   ├── RLS सुरक्षा
          │
          ▼
 [ Edge Functions / API ]
          │
          ▼
 [ SMS Provider (Termii) ]
🧠 Explanation
Frontend (Next.js)
Handles UI, routing (/school_slug/...), and role-based pages
Supabase Auth
Manages login for:
admins
teachers
parents
gatemen
Database (PostgreSQL)
Stores:
students
attendance
schools
notifications
RLS (Row Level Security)
Ensures:
No school sees another school’s data
Parents only see their child
Edge Functions / API
Handles SMS sending
Handles secure operations
Head Admin System
Completely separate backend
Uses custom JWT auth (NOT Supabase)
🔌 2. API DOCUMENTATION
🔐 AUTH
Login (Supabase handles this)
POST /auth/v1/token
👨‍🎓 STUDENTS
Create Student
POST /api/students

Body:

{
  "full_name": "John Doe",
  "class": "JSS 1A",
  "parent_name": "Mrs Doe",
  "parent_phone": "08012345678"
}
Get Students
GET /api/students
📷 QR SCAN
Scan Student
POST /api/scan

Body:

{
  "qr_code": "uuid-string",
  "scan_type": "entry"
}
⚙️ Scan Logic (IMPORTANT)

Backend should:

Find student:
SELECT * FROM students WHERE qr_code = $1;
Check late:
current_time > late_cutoff
Insert attendance:
INSERT INTO attendance_logs (...)
Trigger SMS
📊 ATTENDANCE
Get Attendance
GET /api/attendance?date=2026-01-01
👨‍👩‍👧 PARENT
Get My Child
GET /api/my-child
🏫 HEAD ADMIN API
Create School
POST /head-admin/schools
Suspend School
PATCH /head-admin/schools/:id/suspend
Change Plan
PATCH /head-admin/schools/:id/plan
🌐 3. LANDING PAGE COPY (THIS SELLS)

Use this on your website 👇

🟢 HERO SECTION

Headline:

Never wonder if a student arrived at school again.

Subtext:

Attendy automatically tracks student attendance and instantly notifies parents when their child enters or leaves school.

CTA Buttons:

Get Started
Book Demo
🔥 PROBLEM

Schools still rely on manual attendance registers.
Parents have no real-time visibility.
Security gaps exist at school gates.

⚡ SOLUTION

Attendy replaces manual attendance with a smart QR-based system that tracks every student in real-time.

💡 HOW IT WORKS
Student gets QR ID card
QR is scanned at school gate
Attendance is recorded instantly
Parent receives notification
📱 FEATURES
✅ QR Attendance

Fast, accurate, no manual errors

✅ Instant Alerts

Parents get SMS instantly

✅ Real-Time Dashboard

Admins see everything live

✅ Role-Based Access

Teachers, parents, and staff see only what they need

🔐 SECURITY

Every school’s data is completely isolated.
Powered by secure backend architecture with strict access control.

💰 PRICING

Affordable plans designed for Nigerian schools.

Basic Plan → ₦120,000/year
Scales with your school
🏫 WHO IT’S FOR
Private Schools
Secondary Schools
Primary Schools
🚀 CTA

Start using Attendy today and bring real-time visibility to your school.


🚀 Vision

Attendly is built to become:

A standard attendance system for schools
A parent trust platform
A real-time school monitoring system
📄 License

Private project — not open for redistribution.


[ Get Started ]# attendy
