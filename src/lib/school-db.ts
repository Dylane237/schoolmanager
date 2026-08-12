import 'server-only'
import fs from 'fs'
import path from 'path'
import { after } from 'next/server'
import type Database from 'better-sqlite3'
import type { CloudLoginResult } from './cloud-auth'
import { getDbPathForSlug, getLocalSyncVersionPath } from './paths'
import {
  downloadSchoolDb,
  downloadSchoolDbBuffer,
  fetchCloudDbMeta,
  uploadSchoolDb,
  uploadSchoolDbBuffer,
} from './db-blob-sync'
import { isSupabaseConfigured } from './supabase-admin'
import { getDefaultAnneeScolaireBounds } from './school-year'
import { getMachineFingerprint } from './paths'
import { setVercelActiveSlug } from './school-db-context'
import { markLocalEdited, markLocalSynced, recordSyncError } from './sync-meta'
import { detectSyncConflict } from './sync-conflict'
import { recordSyncEvent } from './sync-monitor'
import { pushSchoolUploads, pullSchoolUploads } from './upload-blob-sync'

const dirtySlugs = new Set<string>()
const preparedSlugs = new Set<string>()
const flushScheduled = new Set<string>()
/** Version blob cloud chargée en mémoire (Vercel, par slug). */
const vercelSyncedVersions = new Map<string, number>()

export interface CloudRegisterSchoolData {
  nom_ecole: string
  directeur_nom: string
  telephone?: string | null
  sections?: string[]
  cle_licence: string
  plan?: string
  date_fin?: string
  email: string
  password_hash: string
}

/** Insère ou met à jour la licence active locale (SQLite mémoire / desktop). */
export function upsertActiveLicenceInDb(
  db: Database.Database,
  ecoleId: string,
  cle_licence: string,
  plan: string,
  date_fin: string,
): void {
  const cle = cle_licence.trim().toUpperCase()
  const existingLic = db.prepare(
    'SELECT id FROM licences WHERE ecole_id = ? AND cle_licence = ?',
  ).get(ecoleId, cle) as { id: string } | undefined

  if (!existingLic) {
    db.prepare(`
      UPDATE licences SET is_active = 0 WHERE ecole_id = ? AND is_active = 1
    `).run(ecoleId)
    db.prepare(`
      INSERT INTO licences (ecole_id, type, date_debut, date_fin, is_active, cle_licence, machine_fingerprint)
      VALUES (?, ?, date('now'), ?, 1, ?, ?)
    `).run(ecoleId, plan, date_fin, cle, getMachineFingerprint())
  } else {
    db.prepare(`
      UPDATE licences SET is_active = 1, type = ?, date_fin = ?, machine_fingerprint = ?
      WHERE id = ?
    `).run(plan, date_fin, getMachineFingerprint(), existingLic.id)
  }

  db.prepare(`
    INSERT INTO licence_cache (cle, plan, date_fin, last_verified, is_active)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(cle) DO UPDATE SET
      plan = excluded.plan,
      date_fin = excluded.date_fin,
      last_verified = excluded.last_verified,
      is_active = 1
  `).run(cle, plan, date_fin, new Date().toISOString())
}

function ensureAnneeScolaireInDb(db: Database.Database, ecoleId: string): void {
  const hasAnnee = db.prepare(
    'SELECT id FROM annees_scolaires WHERE ecole_id = ? LIMIT 1',
  ).get(ecoleId)
  if (hasAnnee) return

  const { label, date_debut, date_fin } = getDefaultAnneeScolaireBounds()
  db.prepare(`
    INSERT INTO annees_scolaires (ecole_id, label, date_debut, date_fin, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(ecoleId, label, date_debut, date_fin)
}

/** Garantit école + licence + admin dans la base locale après inscription cloud (Vercel). */
export function ensureCloudRegisterSchoolData(
  db: Database.Database,
  ecoleSlug: string,
  data: CloudRegisterSchoolData,
): string {
  let ecoleId: string

  const existing = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
  if (existing) {
    ecoleId = existing.id
  } else {
    db.prepare(`
      INSERT INTO ecoles (nom, slug, telephone, directeur_nom, sections, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.nom_ecole,
      ecoleSlug,
      data.telephone ?? null,
      data.directeur_nom,
      JSON.stringify(data.sections ?? ['francophone']),
      data.email,
    )
    ecoleId = (db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string }).id
  }

  ensureAnneeScolaireInDb(db, ecoleId)

  const hasActiveLicence = db.prepare(`
    SELECT id FROM licences
    WHERE ecole_id = ? AND is_active = 1 AND date_fin >= date('now')
    LIMIT 1
  `).get(ecoleId)
  if (!hasActiveLicence && data.cle_licence && data.date_fin) {
    upsertActiveLicenceInDb(
      db,
      ecoleId,
      data.cle_licence,
      data.plan ?? 'standard',
      data.date_fin,
    )
  }

  const hasAdmin = db.prepare(`
    SELECT id FROM users WHERE ecole_id = ? AND role = 'admin' LIMIT 1
  `).get(ecoleId)
  if (!hasAdmin) {
    db.prepare(`
      INSERT INTO users (email, password_hash, nom, role, ecole_id)
      VALUES (?, ?, ?, 'admin', ?)
    `).run(data.email, data.password_hash, data.directeur_nom, ecoleId)
  }

  return ecoleId
}

/** Garantit école + licence + admin dans la base mémoire après connexion cloud (Vercel). */
export function ensureCloudLoginSchoolData(
  db: Database.Database,
  ecoleSlug: string,
  login: CloudLoginResult,
  email: string,
): string {
  let ecoleId: string

  const existing = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
  if (existing) {
    ecoleId = existing.id
  } else {
    db.prepare(`
      INSERT INTO ecoles (nom, slug, telephone, directeur_nom, sections, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      login.ecole_nom,
      ecoleSlug,
      login.telephone ?? null,
      login.directeur_nom ?? login.user.nom,
      JSON.stringify(login.sections ?? ['francophone']),
      email,
    )
    ecoleId = (db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string }).id
  }

  ensureAnneeScolaireInDb(db, ecoleId)

  if (login.cle_licence && login.licence_plan && login.licence_date_fin) {
    upsertActiveLicenceInDb(
      db,
      ecoleId,
      login.cle_licence,
      login.licence_plan,
      login.licence_date_fin,
    )
  }

  const hasAdmin = db.prepare(`
    SELECT id FROM users WHERE ecole_id = ? AND role = 'admin' LIMIT 1
  `).get(ecoleId)
  if (!hasAdmin) {
    db.prepare(`
      INSERT INTO users (email, password_hash, nom, role, ecole_id)
      VALUES (?, ?, ?, 'admin', ?)
    `).run(
      email,
      login.password_hash,
      login.user.nom ?? login.directeur_nom ?? 'Admin',
      ecoleId,
    )
  }

  return ecoleId
}

/** Complète école + licence + admin depuis Supabase (idempotent, Vercel). */
export async function hydrateSchoolFromSupabase(
  db: Database.Database,
  ecoleSlug: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { getSupabaseAdmin } = await import('./supabase-admin')
  const supabase = getSupabaseAdmin()!

  const { data: ecoleCloud } = await supabase
    .from('ecoles')
    .select('nom, directeur_nom, telephone')
    .eq('slug', ecoleSlug)
    .maybeSingle()

  if (!ecoleCloud) return false

  let changed = false
  let ecoleRow = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
  if (!ecoleRow) {
    db.prepare(`
      INSERT INTO ecoles (nom, slug, telephone, directeur_nom, sections)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      ecoleCloud.nom,
      ecoleSlug,
      ecoleCloud.telephone ?? null,
      ecoleCloud.directeur_nom ?? null,
      JSON.stringify(['francophone']),
    )
    ecoleRow = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string }
    changed = true
  }

  ensureAnneeScolaireInDb(db, ecoleRow.id)

  const localActive = db.prepare(`
    SELECT id FROM licences
    WHERE ecole_id = ? AND is_active = 1 AND date_fin >= date('now')
    LIMIT 1
  `).get(ecoleRow.id)

  if (!localActive) {
    const { resolveActiveCloudLicence } = await import('./licence-resolver')
    const licence = await resolveActiveCloudLicence(ecoleSlug)

    if (licence?.cle_licence) {
      upsertActiveLicenceInDb(
        db,
        ecoleRow.id,
        licence.cle_licence,
        licence.type ?? 'standard',
        licence.date_fin.slice(0, 10),
      )
      changed = true
    }
  }

  const { data: cloudUsers } = await supabase
    .from('cloud_users')
    .select('nom, account_id')
    .eq('ecole_slug', ecoleSlug)
    .limit(1)

  if (cloudUsers?.[0]) {
    const { data: account } = await supabase
      .from('cloud_accounts')
      .select('email, password_hash')
      .eq('id', cloudUsers[0].account_id)
      .maybeSingle()

    if (account) {
      const hasAdmin = db.prepare(`
        SELECT id FROM users WHERE ecole_id = ? AND role = 'admin' LIMIT 1
      `).get(ecoleRow.id)
      if (!hasAdmin) {
        db.prepare(`
          INSERT INTO users (email, password_hash, nom, role, ecole_id)
          VALUES (?, ?, ?, 'admin', ?)
        `).run(account.email, account.password_hash, cloudUsers[0].nom ?? 'Admin', ecoleRow.id)
        changed = true
      }
    }
  }

  return changed
}

/** Lit la licence active locale ou la reconstruit depuis Supabase. */
export async function resolveActiveLicence(
  db: Database.Database,
  ecoleSlug: string,
  ecoleId: string,
): Promise<{ type: string; date_fin: string } | null> {
  const readLocal = () => db.prepare(`
    SELECT type, date_fin FROM licences
    WHERE ecole_id = ? AND is_active = 1 AND date_fin >= date('now')
    ORDER BY date_fin DESC
    LIMIT 1
  `).get(ecoleId) as { type: string; date_fin: string } | undefined

  let row = readLocal()
  if (row) return row

  await hydrateSchoolFromSupabase(db, ecoleSlug)
  row = readLocal()
  if (row) return row

  const { resolveActiveCloudLicence } = await import('./licence-resolver')
  const cloud = await resolveActiveCloudLicence(ecoleSlug)
  if (cloud?.cle_licence) {
    upsertActiveLicenceInDb(db, ecoleId, cloud.cle_licence, cloud.type, cloud.date_fin)
    return { type: cloud.type, date_fin: cloud.date_fin }
  }
  return null
}

/** Complète la licence locale depuis Supabase si absente ou expirée (buffer cloud obsolète). */
export async function ensureLocalLicenceFromCloud(
  db: Database.Database,
  ecoleSlug: string,
): Promise<boolean> {
  return hydrateSchoolFromSupabase(db, ecoleSlug)
}

/** Ouvre / télécharge la base école (web ou desktop après pull). */
export async function prepareSchoolDb(ecoleSlug: string): Promise<void> {
  if (process.env.VERCEL) {
    setVercelActiveSlug(ecoleSlug)

    const cloudMeta = isSupabaseConfigured() ? await fetchCloudDbMeta(ecoleSlug) : null
    const localVersion = vercelSyncedVersions.get(ecoleSlug) ?? 0
    const cloudAhead = cloudMeta != null && cloudMeta.version > localVersion
    const canReload = !dirtySlugs.has(ecoleSlug)
    const needsInitialLoad = !preparedSlugs.has(ecoleSlug)
    const needsReload = needsInitialLoad || (cloudAhead && canReload)

    if (needsReload) {
      if (preparedSlugs.has(ecoleSlug)) {
        const { closeDbForSlug } = await import('./db')
        closeDbForSlug(ecoleSlug)
        preparedSlugs.delete(ecoleSlug)
      }

      const { openVercelSchoolDb } = await import('./db')
      let buffer: Buffer | null = null

      if (cloudMeta) {
        buffer = await downloadSchoolDbBuffer(ecoleSlug)
      }

      if (buffer && buffer.length > 0) {
        await openVercelSchoolDb(ecoleSlug, { buffer })
        if (cloudMeta) {
          vercelSyncedVersions.set(ecoleSlug, cloudMeta.version)
          markLocalSynced(ecoleSlug, cloudMeta.version)
        }
      } else {
        await openVercelSchoolDb(ecoleSlug, {
          provision: async (provisionDb) => {
            await provisionSchoolDbFromCloud(provisionDb, ecoleSlug)
          },
        })
      }
      preparedSlugs.add(ecoleSlug)
    }

    const { getDbForSlug } = await import('./db')
    const db = getDbForSlug(ecoleSlug)
    const hydrated = await hydrateSchoolFromSupabase(db, ecoleSlug)
    if (hydrated) markSchoolDbDirty(ecoleSlug)

    const classesHydrated = await hydrateClassesFromCloud(db, ecoleSlug)
    if (classesHydrated) markSchoolDbDirty(ecoleSlug)

    const elevesHydrated = await hydrateElevesFromCloud(db, ecoleSlug)
    if (elevesHydrated) markSchoolDbDirty(ecoleSlug)

    return
  }

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
      markLocalSynced(ecoleSlug, cloudMeta.version)

      const { getDbForSlug } = await import('./db')
      const db = getDbForSlug(ecoleSlug)
      const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
      if (ecole?.id) await pullSchoolUploads(ecoleSlug, ecole.id)
    } else if (!hasLocal) {
      await provisionEmptySchoolDb(ecoleSlug, dbPath)
    }
  } else if (!hasLocal) {
    await provisionEmptySchoolDb(ecoleSlug, dbPath)
  }

  preparedSlugs.add(ecoleSlug)
}

async function provisionSchoolDbFromCloud(
  db: Database.Database,
  ecoleSlug: string,
): Promise<void> {
  const { initSchema, runMigrations, seedInitialData } = await import('./db')
  const { runVersionedMigrations } = await import('./migrations/runner')
  initSchema(db)
  runMigrations(db)
  runVersionedMigrations(db)
  seedInitialData(db)
  await hydrateSchoolFromSupabase(db, ecoleSlug)
}

async function provisionEmptySchoolDb(ecoleSlug: string, dbPath: string): Promise<void> {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  const { createMemoryDb } = await import('./db')
  const mem = createMemoryDb()
  await provisionSchoolDbFromCloud(mem, ecoleSlug)

  const { exportMemoryDbToBuffer } = await import('./db-vercel')
  fs.writeFileSync(dbPath, exportMemoryDbToBuffer(mem))
  mem.close()
}

/** Restaure les classes depuis cloud_classes si la base locale est vide (web). */
async function hydrateClassesFromCloud(
  db: Database.Database,
  ecoleSlug: string,
): Promise<boolean> {
  const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
  if (!ecole) return false

  const localCount = (db.prepare(
    'SELECT COUNT(*) as c FROM classes WHERE ecole_id = ?',
  ).get(ecole.id) as { c: number }).c
  if (localCount > 0) return false

  const { fetchCloudClasses } = await import('./cloud-read')
  const cloudClasses = await fetchCloudClasses(ecoleSlug)
  if (!cloudClasses.length) return false

  const insert = db.prepare(`
    INSERT OR IGNORE INTO classes (id, ecole_id, nom, section, niveau, annee_scolaire, capacite_max)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  for (const c of cloudClasses) {
    insert.run(
      c.id,
      ecole.id,
      c.nom,
      c.section,
      c.niveau,
      c.annee_scolaire,
      c.capacite_max ?? 60,
    )
  }
  return true
}

/** Restaure les élèves depuis cloud_eleves si la base locale est vide (web). */
async function hydrateElevesFromCloud(
  db: Database.Database,
  ecoleSlug: string,
): Promise<boolean> {
  const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
  if (!ecole) return false

  const localCount = (db.prepare(
    'SELECT COUNT(*) as c FROM eleves WHERE ecole_id = ?',
  ).get(ecole.id) as { c: number }).c
  if (localCount > 0) return false

  const { fetchCloudEleves } = await import('./cloud-read')
  const cloudEleves = await fetchCloudEleves(ecoleSlug)
  if (!cloudEleves.length) return false

  const insertEleve = db.prepare(`
    INSERT OR IGNORE INTO eleves (
      id, ecole_id, classe_id, numero_matricule, nom, prenom,
      sexe, section, statut, date_naissance
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertParent = db.prepare(`
    INSERT OR IGNORE INTO parents (eleve_id, nom, telephone, lien, est_principal)
    VALUES (?, ?, ?, 'tuteur', 1)
  `)

  for (const e of cloudEleves) {
    let classeId = e.classe_id
    if (classeId) {
      const classe = db.prepare(
        'SELECT id FROM classes WHERE id = ? AND ecole_id = ?',
      ).get(classeId, ecole.id)
      if (!classe) classeId = null
    }

    insertEleve.run(
      e.id,
      ecole.id,
      classeId,
      e.numero_matricule,
      e.nom,
      e.prenom,
      e.sexe,
      e.section,
      e.statut ?? 'actif',
      e.date_naissance,
    )
    if (e.parent_nom && e.parent_telephone) {
      insertParent.run(e.id, e.parent_nom, e.parent_telephone)
    }
  }
  return true
}

/** Hydrate classes + élèves depuis les tables cloud_* si la base locale est vide. */
export async function hydrateStructuredSchoolData(
  db: Database.Database,
  ecoleSlug: string,
): Promise<boolean> {
  const classes = await hydrateClassesFromCloud(db, ecoleSlug)
  const eleves = await hydrateElevesFromCloud(db, ecoleSlug)
  return classes || eleves
}

/** Marque la base dirty, flush blob + sync structurée (web/desktop). */
export async function persistSchoolChanges(ecoleSlug: string): Promise<void> {
  markSchoolDbDirty(ecoleSlug)
  await flushSchoolDb(ecoleSlug)
}

export function markSchoolDbDirty(ecoleSlug: string): void {
  dirtySlugs.add(ecoleSlug)
  markLocalEdited(ecoleSlug)
}

export function scheduleSchoolDbFlush(ecoleSlug: string): void {
  if (process.env.VERCEL !== '1' || flushScheduled.has(ecoleSlug)) return
  flushScheduled.add(ecoleSlug)

  try {
    after(async () => {
      flushScheduled.delete(ecoleSlug)
      if (!dirtySlugs.has(ecoleSlug)) return
      await flushSchoolDb(ecoleSlug)
    })
  } catch {
    // Hors contexte requête Next.js (tests Vitest)
  }
}

export async function flushSchoolDb(ecoleSlug: string): Promise<void> {
  if (!dirtySlugs.has(ecoleSlug)) return
  dirtySlugs.delete(ecoleSlug)

  if (process.env.VERCEL) {
    const { exportVercelSchoolDbBuffer } = await import('./db')
    const buffer = exportVercelSchoolDbBuffer(ecoleSlug)
    if (!buffer?.length) return

    const result = await uploadSchoolDbBuffer(ecoleSlug, buffer)
    if (result.ok && result.version) {
      vercelSyncedVersions.set(ecoleSlug, result.version)
      markLocalSynced(ecoleSlug, result.version)
      recordSyncEvent(ecoleSlug, 'push_ok', undefined, result.version)

      const { getDbForSlug } = await import('./db')
      const db = getDbForSlug(ecoleSlug)
      const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
      if (ecole?.id) await pushSchoolUploads(ecoleSlug, ecole.id).catch(() => {})
    } else if (result.error && !result.skipped) {
      recordSyncEvent(ecoleSlug, 'push_fail', result.error)
    }

    const { pushSchoolDataFromEcoleIdAsync } = await import('./sync-trigger')
    const { getDbForSlug } = await import('./db')
    const db = getDbForSlug(ecoleSlug)
    const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
    if (ecole?.id) await pushSchoolDataFromEcoleIdAsync(ecole.id, ecoleSlug)
    return
  }

  const { closeDbForSlug } = await import('./db')
  closeDbForSlug(ecoleSlug)

  const dbPath = getDbPathForSlug(ecoleSlug)
  if (!fs.existsSync(dbPath)) return

  const result = await uploadSchoolDb(ecoleSlug, dbPath)
  if (result.ok && result.version) {
    fs.writeFileSync(getLocalSyncVersionPath(ecoleSlug), String(result.version))
    markLocalSynced(ecoleSlug, result.version)
    recordSyncEvent(ecoleSlug, 'push_ok', undefined, result.version)

    const { getDbForSlug } = await import('./db')
    const db = getDbForSlug(ecoleSlug)
    const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
    if (ecole?.id) await pushSchoolUploads(ecoleSlug, ecole.id)
  } else if (result.error) {
    recordSyncEvent(ecoleSlug, 'push_fail', result.error)
  }

  const { pushSchoolDataFromEcoleIdAsync } = await import('./sync-trigger')
  const { getDbForSlug } = await import('./db')
  const db = getDbForSlug(ecoleSlug)
  const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
  if (ecole?.id) await pushSchoolDataFromEcoleIdAsync(ecole.id, ecoleSlug)
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
export async function pullSchoolDbToLocal(
  ecoleSlug: string,
  options?: { force?: boolean },
): Promise<{ pulled: boolean; version?: number; conflict?: boolean }> {
  const cloudMeta = await fetchCloudDbMeta(ecoleSlug)
  if (!cloudMeta) return { pulled: false }

  const versionPath = getLocalSyncVersionPath(ecoleSlug)
  const localVersion = fs.existsSync(versionPath)
    ? Number(fs.readFileSync(versionPath, 'utf8').trim()) || 0
    : 0

  if (cloudMeta.version <= localVersion) return { pulled: false, version: localVersion }

  const conflict = await detectSyncConflict(ecoleSlug)
  if (!options?.force && conflict.hasConflict) {
    recordSyncEvent(ecoleSlug, 'conflict', 'Cloud plus récent avec modifications locales')
    return { pulled: false, version: localVersion, conflict: true }
  }

  const { closeDbForSlug, resetDesktopDbSingleton } = await import('./db')
  closeDbForSlug(ecoleSlug)
  resetDesktopDbSingleton()

  const dbPath = getDbPathForSlug(ecoleSlug)
  const ok = await downloadSchoolDb(ecoleSlug, dbPath)
  if (ok) {
    fs.writeFileSync(versionPath, String(cloudMeta.version))
    markLocalSynced(ecoleSlug, cloudMeta.version)
    preparedSlugs.delete(ecoleSlug)
    recordSyncEvent(ecoleSlug, 'pull_ok', undefined, cloudMeta.version)

    const { getDbForSlug } = await import('./db')
    const db = getDbForSlug(ecoleSlug)
    const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
    if (ecole?.id) await pullSchoolUploads(ecoleSlug, ecole.id)

    return { pulled: true, version: cloudMeta.version }
  }
  recordSyncEvent(ecoleSlug, 'pull_fail', 'Téléchargement DB échoué')
  return { pulled: false }
}

/** Push local → cloud (desktop). */
export async function pushSchoolDbFromLocal(
  ecoleSlug: string,
  options?: { force?: boolean },
): Promise<{ ok: boolean; version?: number; error?: string; conflict?: boolean }> {
  if (!options?.force) {
    const conflict = await detectSyncConflict(ecoleSlug)
    if (conflict.hasConflict) {
      recordSyncEvent(ecoleSlug, 'conflict', 'Push bloqué — cloud modifié entre-temps')
      return { ok: false, conflict: true, error: 'Conflit de synchronisation' }
    }
  }

  if (process.env.VERCEL) {
    const { exportVercelSchoolDbBuffer } = await import('./db')
    const buffer = exportVercelSchoolDbBuffer(ecoleSlug)
    if (!buffer?.length) return { ok: false, error: 'Base mémoire introuvable' }

    const result = await uploadSchoolDbBuffer(ecoleSlug, buffer)
    if (result.ok && result.version) {
      vercelSyncedVersions.set(ecoleSlug, result.version)
      markLocalSynced(ecoleSlug, result.version)
      dirtySlugs.delete(ecoleSlug)
      recordSyncEvent(ecoleSlug, 'push_ok', undefined, result.version)

      const { getDbForSlug } = await import('./db')
      const db = getDbForSlug(ecoleSlug)
      const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
      if (ecole?.id) await pushSchoolUploads(ecoleSlug, ecole.id).catch(() => {})
    } else if (result.error && !result.skipped) {
      recordSyncError(ecoleSlug, result.error)
      recordSyncEvent(ecoleSlug, 'push_fail', result.error)
    }
    return result
  }

  const { closeDbForSlug, resetDesktopDbSingleton, getDb } = await import('./db')
  const db = getDb()
  db.pragma('wal_checkpoint(TRUNCATE)')
  closeDbForSlug()
  resetDesktopDbSingleton()
  const dbPath = getDbPathForSlug()

  if (!fs.existsSync(dbPath)) return { ok: false, error: 'Base locale introuvable' }

  const result = await uploadSchoolDb(ecoleSlug, dbPath)
  if (result.ok && result.version) {
    fs.writeFileSync(getLocalSyncVersionPath(ecoleSlug), String(result.version))
    markLocalSynced(ecoleSlug, result.version)
    dirtySlugs.delete(ecoleSlug)
    recordSyncEvent(ecoleSlug, 'push_ok', undefined, result.version)

    const { getDbForSlug } = await import('./db')
    const dbReloaded = getDbForSlug(ecoleSlug)
    const ecole = dbReloaded.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
    if (ecole?.id) await pushSchoolUploads(ecoleSlug, ecole.id).catch(() => {})
  } else if (result.error && !result.skipped) {
    recordSyncError(ecoleSlug, result.error)
    recordSyncEvent(ecoleSlug, 'push_fail', result.error)
  }
  return result
}

export function clearSchoolDbCache(ecoleSlug?: string): void {
  if (ecoleSlug) {
    preparedSlugs.delete(ecoleSlug)
    vercelSyncedVersions.delete(ecoleSlug)
    return
  }
  preparedSlugs.clear()
  vercelSyncedVersions.clear()
}
