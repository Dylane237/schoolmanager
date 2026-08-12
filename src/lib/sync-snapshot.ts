import 'server-only'
import type Database from 'better-sqlite3'
import { downloadSchoolDbBuffer } from './db-blob-sync'
import { tryLoadBufferIntoMemoryDb } from './db-vercel'
import { isSupabaseConfigured } from './supabase-admin'

/** Ouvre le blob cloud en mémoire pour comparaison / merge granulaire. */
export async function openCloudSnapshotDb(ecoleSlug: string): Promise<Database.Database | null> {
  if (!isSupabaseConfigured()) return null

  const buffer = await downloadSchoolDbBuffer(ecoleSlug)
  if (!buffer?.length) return null

  return tryLoadBufferIntoMemoryDb(buffer)
}

export function resolveEcoleIdFromDb(db: Database.Database, ecoleSlug: string): string | null {
  const row = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
  return row?.id ?? null
}
