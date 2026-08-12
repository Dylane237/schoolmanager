import { NextResponse } from 'next/server'
import type { AuthUser } from './auth'
import { getDb } from './db-server'
import { resolveEcoleId, persistSchoolChanges } from './school-db'
import { recordLocalSyncChange, type SyncChangeEntry } from './sync-changelog'

export function hasSchoolAccess(user: AuthUser | null | undefined): user is AuthUser {
  return !!(user && (user.ecole_id || user.ecole_slug))
}

export function getSchoolDbContext(user: AuthUser) {
  const db = getDb(user.ecole_slug ?? undefined)
  const ecoleId = resolveEcoleId(db, user.ecole_slug, user.ecole_id)
  return { db, ecoleId, ecoleSlug: user.ecole_slug }
}

export async function persistSchoolWrite(
  ecoleSlug: string | null | undefined,
  change?: Omit<SyncChangeEntry, 'at' | 'platform'>,
): Promise<void> {
  if (!ecoleSlug) return
  if (change) recordLocalSyncChange(ecoleSlug, change)
  await persistSchoolChanges(ecoleSlug)
}

/** Réponse JSON après persistance cloud (mutations école). */
export async function jsonPersist(
  ecoleSlug: string | null | undefined,
  data: unknown,
  init?: ResponseInit,
  change?: Omit<SyncChangeEntry, 'at' | 'platform'>,
): Promise<NextResponse> {
  await persistSchoolWrite(ecoleSlug, change)
  return NextResponse.json(data, init)
}
