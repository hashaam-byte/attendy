import { requireHeadAdmin } from '@/lib/head-admin/auth'
import HeadAdminNav from './HeadAdminNav'

export default async function HeadAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Every page under /head-admin (except /login) requires auth
  // The login page is excluded via the check inside requireHeadAdmin
  return (
    <div className="min-h-screen bg-gray-950">
      {children}
    </div>
  )
}