import { NextRequest, NextResponse } from 'next/server'
import {
  clearAdminLicencesCookie,
  setAdminLicencesCookie,
  signAdminLicencesToken,
  verifyAdminLicencesPassword,
} from '@/lib/admin-licences-auth'

export async function POST(request: NextRequest) {
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
