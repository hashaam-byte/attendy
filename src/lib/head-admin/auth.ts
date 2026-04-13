import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const JWT_SECRET = new TextEncoder().encode(
  process.env.HEAD_ADMIN_JWT_SECRET ?? 'change-this-secret-in-production-min-32-chars!!'
)

export interface HeadAdminPayload {
  sub: string
  email: string
  name: string
  role: 'head_admin'
}

export async function getHeadAdminSession(): Promise<HeadAdminPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('head_admin_token')?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as HeadAdminPayload
  } catch {
    return null
  }
}

export async function requireHeadAdmin(): Promise<HeadAdminPayload> {
  const session = await getHeadAdminSession()
  if (!session) redirect('/head-admin/login')
  return session
}