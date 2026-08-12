import { NextResponse } from 'next/server'
import type { AuthUser } from './auth'
import { getDb } from './db-server'
import { resolveEcoleId, persistSchoolChanges } from './school-db'

export function hasSchoolAccess(user: AuthUser | null | undefined): user is AuthUser {
  return !!(user && (user.ecole_id || user.ecole_slug))
}

export function getSchoolDbContext(user: AuthUser) {
  const db = getDb(user.ecole_slug ?? undefined)
  const ecoleId = resolveEcoleId(db, user.ecole_slug, user.ecole_id)
  return { db, ecoleId, ecoleSlug: user.ecole_slug }
}

export async function persistSchoolWrite(ecoleSlug: string | null | undefined): Promise<void> {
  if (ecoleSlug) await persistSchoolChanges(ecoleSlug)
}

/** Réponse JSON après persistance cloud (mutations école). */
export async function jsonPersist(
  ecoleSlug: string | null | undefined,
  data: unknown,
  init?: ResponseInit,
): Promise<NextResponse> {
  await persistSchoolWrite(ecoleSlug)
  return NextResponse.json(data, init)
}
