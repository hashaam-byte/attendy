'use client'
import { QRCodeCanvas } from 'qrcode.react'
import { Student } from '@/lib/supabase/types'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import { useRef } from 'react'

export default function QRCardClient({
  student,
  schoolName,
  schoolSlug,
}: {
  student: Student
  schoolName: string
  schoolSlug: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Link
          href={`/${schoolSlug}/admin/students`}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-white text-2xl font-bold">QR Card</h1>
      </div>

      {/* Printable card */}
      <div className="flex justify-center">
        <div
          ref={cardRef}
          className="bg-white rounded-2xl p-6 w-72 text-center shadow-xl print:shadow-none"
          id="qr-card"
        >
          {/* School name */}
          <div className="bg-green-600 text-white py-2 px-4 rounded-xl mb-4">
            <p className="font-bold text-sm">{schoolName}</p>
            <p className="text-xs opacity-80">Student ID Card</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-4">
            <QRCodeCanvas
              value={student.qr_code}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
            />
          </div>

          {/* Student info */}
          <div className="border-t pt-3">
            <p className="font-bold text-gray-900 text-base">{student.full_name}</p>
            <p className="text-gray-500 text-sm">{student.class}</p>
            <p className="text-gray-400 text-xs mt-1 font-mono">{student.qr_code.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center mt-6 gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Printer size={18} />
          Print QR Card
        </button>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #qr-card, #qr-card * { visibility: visible; }
          #qr-card { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  )
}