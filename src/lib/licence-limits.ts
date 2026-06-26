import 'server-only'
import type Database from 'better-sqlite3'
import { PLAN_STUDENT_LIMITS, type LicencePlan } from './licence-constants'

export function getActiveLicenceType(db: Database.Database, ecoleId: string): LicencePlan | null {
  const row = db.prepare(`
    SELECT type FROM licences
    WHERE ecole_id = ? AND is_active = 1 AND date_fin >= date('now')
    ORDER BY date_fin DESC LIMIT 1
  `).get(ecoleId) as { type: string } | undefined

  if (!row?.type || !(row.type in PLAN_STUDENT_LIMITS)) return null
  return row.type as LicencePlan
}

export function checkStudentLimit(db: Database.Database, ecoleId: string): string | null {
  const plan = getActiveLicenceType(db, ecoleId)
  if (!plan) return 'Licence inactive ou expirée'

  const limit = PLAN_STUDENT_LIMITS[plan]
  if (limit === null) return null

  const count = (db.prepare(
    "SELECT COUNT(*) as count FROM eleves WHERE ecole_id = ? AND statut = 'actif'"
  ).get(ecoleId) as { count: number })?.count ?? 0

  if (count >= limit) {
    return `Limite de ${limit} élèves atteinte pour le plan ${plan}`
  }
  return null
}
