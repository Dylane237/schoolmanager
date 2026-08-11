import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import { getJwtSecretKey } from './secrets'
import { getSuperAdminPassword } from './super-admin-credentials'

export const ADMIN_LICENCES_COOKIE = 'admin_licences_token'
const TOKEN_SCOPE = 'admin_licences'
const TOKEN_EXPIRY = '8h'

export async function signAdminLicencesToken(): Promise<string> {
  return new SignJWT({ scope: TOKEN_SCOPE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getJwtSecretKey())
}

export async function verifyAdminLicencesToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    return payload.scope === TOKEN_SCOPE
  } catch {
    return false
  }
}

export async function isAdminLicencesAuthed(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_LICENCES_COOKIE)?.value
  if (!token) return false
  return verifyAdminLicencesToken(token)
}

export function setAdminLicencesCookie(response: NextResponse, token: string): void {
  const secure = process.env.NODE_ENV === 'production' && process.env.SM_COOKIE_SECURE !== 'false'
  response.cookies.set(ADMIN_LICENCES_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
}

export function clearAdminLicencesCookie(response: NextResponse): void {
  response.cookies.delete(ADMIN_LICENCES_COOKIE)
}

export function verifyAdminLicencesPassword(password: string): boolean {
  const expected = getSuperAdminPassword()
  if (!expected) return false
  return password === expected
}
