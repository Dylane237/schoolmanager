import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { getDb } from './db-server'
import { getJwtSecret, getJwtSecretKey } from './secrets'
import { getMachineFingerprint } from './paths'
import { runtimeEnv } from './runtime-env'

export const JWT_EXPIRY = '8h'
export const COOKIE_NAME = 'sm_token'

export interface AuthUser {
  id: string
  role: string
  ecole_id: string | null
  ecole_slug: string | null
  nom: string | null
  auth_source?: 'local' | 'cloud'
  account_id?: string
  prenom?: string | null
}

export interface JwtPayload extends AuthUser {
  [key: string]: unknown
}

export async function signToken(payload: AuthUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJwtSecretKey())
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    return payload as JwtPayload
  } catch {
    return null
  }
}

export async function getUserFromRequest(request: NextRequest): Promise<JwtPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireUser(request: NextRequest): Promise<JwtPayload | NextResponse> {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  return user
}

export async function requireSuperAdmin(request: NextRequest): Promise<JwtPayload | null> {
  const user = await getUserFromRequest(request)
  if (!user || user.role !== 'super_admin') return null
  return user
}

export function setAuthCookie(response: import('next/server').NextResponse, token: string) {
  const secure = process.env.NODE_ENV === 'production' && runtimeEnv('SM_COOKIE_SECURE') !== 'false'
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
}

export function clearAuthCookie(response: import('next/server').NextResponse) {
  response.cookies.delete(COOKIE_NAME)
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()

  // ── Super admin : env ou fichier credentials local (Electron) ──
  const { getSuperAdminEmail, getSuperAdminPassword } = await import('./super-admin-credentials')
  const superAdminEmail = getSuperAdminEmail()
  const superAdminPassword = getSuperAdminPassword()

  if (superAdminPassword && normalizedEmail === superAdminEmail && password === superAdminPassword) {
    const payload: AuthUser = {
      id: 'super-admin',
      role: 'super_admin',
      ecole_id: null,
      ecole_slug: null,
      nom: 'Super Admin',
      auth_source: 'local',
    }
    const token = await signToken(payload)
    return { token, user: payload }
  }

  const { isCloudAuthAvailable, loginCloudUser, cloudAuthErrorMessage } = await import('./cloud-auth')

  // ── Web (Vercel) : auth cloud uniquement ──
  if (process.env.VERCEL && isCloudAuthAvailable()) {
    const cloud = await loginCloudUser(normalizedEmail, password)
    if (!cloud.ok) {
      return { error: cloudAuthErrorMessage(cloud.error) as 'Email introuvable' | 'Mot de passe incorrect' | 'Licence expirée' }
    }
    const user: AuthUser = { ...cloud.result.user, auth_source: 'cloud' }
    const token = await signToken(user)
    return { token, user }
  }

  // ── Desktop : SQLite d'abord, puis cloud si email absent localement ──
  const localResult = await loginLocalUser(normalizedEmail, password)
  if (!('error' in localResult)) return localResult
  if (localResult.error === 'Mot de passe incorrect' || localResult.error === 'Licence expirée' || localResult.error === 'Licence utilisée sur un autre ordinateur') {
    return localResult
  }

  if (isCloudAuthAvailable()) {
    const cloud = await loginCloudUser(normalizedEmail, password)
    if (!cloud.ok) {
      return { error: cloudAuthErrorMessage(cloud.error) as 'Email introuvable' | 'Mot de passe incorrect' | 'Licence expirée' }
    }
    const { buildLocalAuthFromCloudLogin } = await import('./local-provision')
    const user = buildLocalAuthFromCloudLogin(cloud.result, normalizedEmail)
    const token = await signToken(user)
    return { token, user }
  }

  return localResult
}

async function loginLocalUser(email: string, password: string) {
  let db: ReturnType<typeof getDb>
  try {
    db = getDb()
  } catch {
    return { error: 'Email introuvable' as const }
  }

  const user = db.prepare(`
    SELECT u.*, e.slug as ecole_slug
    FROM users u
    LEFT JOIN ecoles e ON e.id = u.ecole_id
    WHERE u.email = ?
  `).get(email) as Record<string, unknown> | undefined

  if (!user) {
    return { error: 'Email introuvable' as const }
  }

  const valid = await bcrypt.compare(password, user.password_hash as string)
  if (!valid) {
    return { error: 'Mot de passe incorrect' as const }
  }

  if (user.role !== 'super_admin' && user.ecole_id) {
    const today = new Date().toISOString().split('T')[0]
    const licence = db.prepare(`
      SELECT id, machine_fingerprint FROM licences
      WHERE ecole_id = ? AND is_active = 1 AND date_fin >= ?
      ORDER BY date_fin DESC LIMIT 1
    `).get(user.ecole_id, today) as { id: string; machine_fingerprint: string | null } | undefined

    if (!licence) {
      return { error: 'Licence expirée' as const }
    }

    const fingerprint = getMachineFingerprint()
    if (licence.machine_fingerprint && licence.machine_fingerprint !== fingerprint) {
      return { error: 'Licence utilisée sur un autre ordinateur' as const }
    }
    if (!licence.machine_fingerprint) {
      db.prepare('UPDATE licences SET machine_fingerprint = ? WHERE id = ?').run(fingerprint, licence.id)
    }
  }

  const payload: AuthUser = {
    id: user.id as string,
    role: user.role as string,
    ecole_id: (user.ecole_id as string) || null,
    ecole_slug: (user.ecole_slug as string) || null,
    nom: (user.nom as string) || null,
    prenom: (user.prenom as string) as string | null | undefined,
    auth_source: 'local',
  }

  const token = await signToken(payload)
  return { token, user: payload }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}
