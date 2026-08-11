import { NextRequest, NextResponse } from 'next/server'
import {
  clearAdminLicencesCookie,
  setAdminLicencesCookie,
  signAdminLicencesToken,
  verifyAdminLicencesPassword,
} from '@/lib/admin-licences-auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(`admin-auth:${ip}`, 10, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec ?? 60)

  const { password } = await request.json()

  if (!verifyAdminLicencesPassword(password)) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  const token = await signAdminLicencesToken()
  const response = NextResponse.json({ ok: true })
  setAdminLicencesCookie(response, token)
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  clearAdminLicencesCookie(response)
  return response
}
