import type Database from 'better-sqlite3'

export interface SyncEntityCounts {
  classes: number
  eleves: number
  paiements: number
  notes: number
  tranches: number
  matieres: number
  personnel: number
  frais_annexes: number
  presences: number
}

export function countSyncEntities(db: Database.Database, ecoleId: string): SyncEntityCounts {
  const count = (sql: string) =>
    (db.prepare(sql).get(ecoleId) as { n: number } | undefined)?.n ?? 0

  return {
    classes: count('SELECT COUNT(*) as n FROM classes WHERE ecole_id = ?'),
    eleves: count('SELECT COUNT(*) as n FROM eleves WHERE ecole_id = ?'),
    paiements: count('SELECT COUNT(*) as n FROM paiements WHERE ecole_id = ?'),
    notes: count('SELECT COUNT(*) as n FROM notes WHERE ecole_id = ?'),
    tranches: count('SELECT COUNT(*) as n FROM tranches_config WHERE ecole_id = ?'),
    matieres: count('SELECT COUNT(*) as n FROM matieres WHERE ecole_id = ?'),
    personnel: count('SELECT COUNT(*) as n FROM personnel WHERE ecole_id = ?'),
    frais_annexes: count('SELECT COUNT(*) as n FROM frais_annexes WHERE ecole_id = ?'),
    presences: count('SELECT COUNT(*) as n FROM presences WHERE ecole_id = ?'),
  }
}
