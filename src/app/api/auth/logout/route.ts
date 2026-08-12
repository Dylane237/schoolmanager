import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookie, getUserFromRequest } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db-server'
import { getSuperAdminEmail } from '../../../../lib/super-admin-credentials'

export async function POST(request: NextRequest) {
  let email: string | null = null
  const user = await getUserFromRequest(request)

  if (user) {
    if (user.role === 'super_admin') {
      email = getSuperAdminEmail()
    } else {
      try {
        const db = getDb()
        const row = db.prepare('SELECT email FROM users WHERE id = ?').get(user.id) as { email: string } | undefined
        email = row?.email ?? null
      } catch {
        // DB indisponible — déconnexion quand même
      }
    }
  }

  const response = NextResponse.json({ success: true, email })
  clearAuthCookie(response)
  return response
}
