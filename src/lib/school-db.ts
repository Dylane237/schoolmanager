import 'server-only'
import fs from 'fs'
import path from 'path'
import { after } from 'next/server'
import type Database from 'better-sqlite3'
import { getDbPathForSlug, getLocalSyncVersionPath } from './paths'
import {
  downloadSchoolDb,
  fetchCloudDbMeta,
  uploadSchoolDb,
} from './db-blob-sync'
import { isSupabaseConfigured } from './supabase-admin'
import { getDefaultAnneeScolaireBounds } from './school-year'
import { getMachineFingerprint } from './paths'
import { setVercelActiveSlug } from './school-db-context'

const dirtySlugs = new Set<string>()
const preparedSlugs = new Set<string>()
const flushScheduled = new Set<string>()

/** Ouvre / télécharge la base école (web ou desktop après pull). */
export async function prepareSchoolDb(ecoleSlug: string): Promise<void> {
  if (process.env.VERCEL) setVercelActiveSlug(ecoleSlug)
  if (preparedSlugs.has(ecoleSlug)) return

  const dbPath = getDbPathForSlug(ecoleSlug)
  const versionPath = getLocalSyncVersionPath(ecoleSlug)
  const hasLocal = fs.existsSync(dbPath)

  if (isSupabaseConfigured()) {
    const cloudMeta = await fetchCloudDbMeta(ecoleSlug)
    const localVersion = hasLocal && fs.existsSync(versionPath)
      ? Number(fs.readFileSync(versionPath, 'utf8').trim()) || 0
      : 0

    if (cloudMeta && (!hasLocal || cloudMeta.version > localVersion)) {
      await downloadSchoolDb(ecoleSlug, dbPath)
      fs.writeFileSync(versionPath, String(cloudMeta.version))
    } else if (!hasLocal) {
      await provisionEmptySchoolDb(ecoleSlug, dbPath)
    }
  } else if (!hasLocal) {
    await provisionEmptySchoolDb(ecoleSlug, dbPath)
  }

  preparedSlugs.add(ecoleSlug)
}

async function provisionEmptySchoolDb(ecoleSlug: string, dbPath: string): Promise<void> {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  const { createMemoryDb } = await import('./db')
  const mem = createMemoryDb()

  if (isSupabaseConfigured()) {
    const { getSupabaseAdmin } = await import('./supabase-admin')
    const supabase = getSupabaseAdmin()!

    const { data: ecole } = await supabase
      .from('ecoles')
      .select('nom, directeur_nom, telephone')
      .eq('slug', ecoleSlug)
      .maybeSingle()

    const { data: licence } = await supabase
      .from('licences')
      .select('cle_licence, type, date_fin, is_active')
      .eq('ecole_slug', ecoleSlug)
      .eq('is_active', true)
      .order('date_fin', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (ecole) {
      mem.prepare(`
        INSERT INTO ecoles (nom, slug, telephone, directeur_nom, sections)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        ecole.nom,
        ecoleSlug,
        ecole.telephone ?? null,
        ecole.directeur_nom ?? null,
        JSON.stringify(['francophone']),
      )

      const ecoleRow = mem.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string }
      const { label, date_debut, date_fin } = getDefaultAnneeScolaireBounds()
      mem.prepare(`
        INSERT INTO annees_scolaires (ecole_id, label, date_debut, date_fin, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(ecoleRow.id, label, date_debut, date_fin)

      if (licence?.cle_licence) {
        mem.prepare(`
          INSERT INTO licences (ecole_id, type, date_debut, date_fin, is_active, cle_licence, machine_fingerprint)
          VALUES (?, ?, date('now'), ?, 1, ?, ?)
        `).run(
          ecoleRow.id,
          licence.type ?? 'standard',
          licence.date_fin,
          licence.cle_licence,
          getMachineFingerprint(),
        )
      }

      const { data: cloudUsers } = await supabase
        .from('cloud_users')
        .select('nom, telephone, account_id')
        .eq('ecole_slug', ecoleSlug)
        .limit(1)

      if (cloudUsers?.[0]) {
        const { data: account } = await supabase
          .from('cloud_accounts')
          .select('email, password_hash')
          .eq('id', cloudUsers[0].account_id)
          .maybeSingle()

        if (account) {
          mem.prepare(`
            INSERT INTO users (email, password_hash, nom, role, ecole_id)
            VALUES (?, ?, ?, 'admin', ?)
          `).run(account.email, account.password_hash, cloudUsers[0].nom ?? 'Admin', ecoleRow.id)
        }
      }
    }
  }

  mem.pragma('wal_checkpoint(TRUNCATE)')
  await mem.backup(dbPath)
  mem.close()
}

export function markSchoolDbDirty(ecoleSlug: string): void {
  dirtySlugs.add(ecoleSlug)
}

export function scheduleSchoolDbFlush(ecoleSlug: string): void {
  if (!process.env.VERCEL || flushScheduled.has(ecoleSlug)) return
  flushScheduled.add(ecoleSlug)

  after(async () => {
    flushScheduled.delete(ecoleSlug)
    if (!dirtySlugs.has(ecoleSlug)) return
    await flushSchoolDb(ecoleSlug)
  })
}

export async function flushSchoolDb(ecoleSlug: string): Promise<void> {
  if (!dirtySlugs.has(ecoleSlug)) return
  dirtySlugs.delete(ecoleSlug)

  const { closeDbForSlug } = await import('./db')
  closeDbForSlug(ecoleSlug)

  const dbPath = getDbPathForSlug(ecoleSlug)
  if (!fs.existsSync(dbPath)) return

  const result = await uploadSchoolDb(ecoleSlug, dbPath)
  if (result.ok && result.version) {
    fs.writeFileSync(getLocalSyncVersionPath(ecoleSlug), String(result.version))
  }

  const { pushSchoolDataFromEcoleId } = await import('./sync-trigger')
  const { getDbForSlug } = await import('./db')
  const db = getDbForSlug(ecoleSlug)
  const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
  if (ecole?.id) pushSchoolDataFromEcoleId(ecole.id)
}

export function resolveEcoleId(
  db: Database.Database,
  ecoleSlug: string | null | undefined,
  ecoleId: string | null | undefined,
): string | null {
  if (!ecoleSlug) return ecoleId ?? null

  if (ecoleId && ecoleId !== ecoleSlug && ecoleId.length >= 32) {
    const row = db.prepare('SELECT id FROM ecoles WHERE id = ?').get(ecoleId) as { id: string } | undefined
    if (row) return row.id
  }

  const bySlug = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
  return bySlug?.id ?? ecoleId ?? null
}

/** Pull cloud → local (desktop). Remplace le fichier si le cloud est plus récent. */
export async function pullSchoolDbToLocal(ecoleSlug: string): Promise<{ pulled: boolean; version?: number }> {
  const cloudMeta = await fetchCloudDbMeta(ecoleSlug)
  if (!cloudMeta) return { pulled: false }

  const versionPath = getLocalSyncVersionPath(ecoleSlug)
  const localVersion = fs.existsSync(versionPath)
    ? Number(fs.readFileSync(versionPath, 'utf8').trim()) || 0
    : 0

  if (cloudMeta.version <= localVersion) return { pulled: false, version: localVersion }

  const { closeDbForSlug, resetDesktopDbSingleton } = await import('./db')
  closeDbForSlug(ecoleSlug)
  resetDesktopDbSingleton()

  const dbPath = getDbPathForSlug(ecoleSlug)
  const ok = await downloadSchoolDb(ecoleSlug, dbPath)
  if (ok) {
    fs.writeFileSync(versionPath, String(cloudMeta.version))
    preparedSlugs.delete(ecoleSlug)
    return { pulled: true, version: cloudMeta.version }
  }
  return { pulled: false }
}

/** Push local → cloud (desktop). */
export async function pushSchoolDbFromLocal(ecoleSlug: string): Promise<{ ok: boolean; version?: number; error?: string }> {
  const { closeDbForSlug, getDbForSlug, resetDesktopDbSingleton } = await import('./db')

  let dbPath: string
  if (process.env.VERCEL) {
    dbPath = getDbPathForSlug(ecoleSlug)
  } else {
    const { getDb } = await import('./db')
    const db = getDb()
    db.pragma('wal_checkpoint(TRUNCATE)')
    closeDbForSlug()
    resetDesktopDbSingleton()
    dbPath = getDbPathForSlug()
  }

  if (!fs.existsSync(dbPath)) return { ok: false, error: 'Base locale introuvable' }

  const result = await uploadSchoolDb(ecoleSlug, dbPath)
  if (result.ok && result.version) {
    fs.writeFileSync(getLocalSyncVersionPath(ecoleSlug), String(result.version))
    dirtySlugs.delete(ecoleSlug)
  }
  return result
}

export function clearSchoolDbCache(ecoleSlug?: string): void {
  if (ecoleSlug) {
    preparedSlugs.delete(ecoleSlug)
    return
  }
  preparedSlugs.clear()
}
