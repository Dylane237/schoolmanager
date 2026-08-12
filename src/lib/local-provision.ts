import type Database from 'better-sqlite3'
import { getDb } from './db-server'
import { getDefaultAnneeScolaireBounds } from './school-year'
import type { CloudLoginResult } from './cloud-auth'
import { linkCloudUserLocalId } from './cloud-auth'
import { getMachineFingerprint } from './paths'

/** Crée ou met à jour l'établissement et l'utilisateur locaux après connexion cloud (desktop). */
export function provisionLocalFromCloud(login: CloudLoginResult): AuthProvisionResult {
  const db = getDb()
  const slug = login.user.ecole_slug!

  let ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(slug) as { id: string } | undefined

  if (!ecole) {
    db.prepare(`
      INSERT INTO ecoles (nom, slug, telephone, directeur_nom, sections, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      login.ecole_nom,
      slug,
      login.telephone ?? null,
      login.directeur_nom ?? login.user.nom,
      JSON.stringify(login.sections ?? ['francophone']),
      null,
    )
    ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(slug) as { id: string }
  }

  const ecoleId = ecole.id

  if (login.cle_licence && login.licence_plan && login.licence_date_fin) {
    const existingLic = db.prepare(
      'SELECT id FROM licences WHERE ecole_id = ? AND cle_licence = ?',
    ).get(ecoleId, login.cle_licence) as { id: string } | undefined

    if (!existingLic) {
      db.prepare(`
        INSERT INTO licences (ecole_id, type, date_debut, date_fin, is_active, cle_licence, machine_fingerprint)
        VALUES (?, ?, date('now'), ?, 1, ?, ?)
      `).run(ecoleId, login.licence_plan, login.licence_date_fin, login.cle_licence, getMachineFingerprint())
    } else {
      db.prepare(`
        UPDATE licences SET is_active = 1, date_fin = ?, machine_fingerprint = ?
        WHERE id = ?
      `).run(login.licence_date_fin, getMachineFingerprint(), existingLic.id)
    }

    db.prepare(`
      INSERT INTO licence_cache (cle, plan, date_fin, last_verified, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(cle) DO UPDATE SET
        plan = excluded.plan,
        date_fin = excluded.date_fin,
        last_verified = excluded.last_verified,
        is_active = 1
    `).run(login.cle_licence, login.licence_plan, login.licence_date_fin, new Date().toISOString())
  }

  ensureAnneeScolaire(db, ecoleId)

  return { ecoleId, slug }
}

export interface AuthProvisionResult {
  ecoleId: string
  slug: string
}

export function provisionLocalUser(
  db: Database.Database,
  ecoleId: string,
  email: string,
  passwordHash: string,
  nom: string,
  accountId: string,
  ecoleSlug: string,
  cloudUserId: string,
): string {
  const normalized = email.trim().toLowerCase()
  let user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized) as { id: string } | undefined

  if (user) {
    db.prepare('UPDATE users SET password_hash = ?, nom = ?, ecole_id = ?, role = ? WHERE id = ?').run(
      passwordHash, nom, ecoleId, 'admin', user.id,
    )
  } else {
    db.prepare(`
      INSERT INTO users (email, password_hash, nom, role, ecole_id)
      VALUES (?, ?, ?, 'admin', ?)
    `).run(normalized, passwordHash, nom, ecoleId)
    user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized) as { id: string }
  }

  linkCloudUserLocalId(accountId, ecoleSlug, user.id).catch(() => {})
  return user.id
}

function ensureAnneeScolaire(db: Database.Database, ecoleId: string) {
  const active = db.prepare(
    'SELECT id FROM annees_scolaires WHERE ecole_id = ? AND is_active = 1',
  ).get(ecoleId)
  if (active) return

  const { label, date_debut, date_fin } = getDefaultAnneeScolaireBounds()
  db.prepare(`
    INSERT INTO annees_scolaires (ecole_id, label, date_debut, date_fin, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(ecoleId, label, date_debut, date_fin)
}

export function buildLocalAuthFromCloudLogin(
  login: CloudLoginResult,
  email: string,
): { id: string; role: string; ecole_id: string; ecole_slug: string; nom: string | null; auth_source: 'local' } {
  const db = getDb()
  const { ecoleId, slug } = provisionLocalFromCloud(login)
  const localUserId = provisionLocalUser(
    db,
    ecoleId,
    email,
    login.password_hash,
    login.user.nom ?? 'Admin',
    login.user.account_id,
    slug,
    login.user.id,
  )

  return {
    id: localUserId,
    role: login.user.role,
    ecole_id: ecoleId,
    ecole_slug: slug,
    nom: login.user.nom,
    auth_source: 'local',
  }
}
