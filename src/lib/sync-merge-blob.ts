import 'server-only'
import type Database from 'better-sqlite3'
import { parseTrancheKey } from './sync-diff-blob'

function copyPaiementFromCloud(
  localDb: Database.Database,
  cloudDb: Database.Database,
  ecoleId: string,
  paiementId: string,
): string | null {
  const row = cloudDb.prepare('SELECT * FROM paiements WHERE id = ?').get(paiementId) as Record<string, unknown> | undefined
  if (!row) return 'Paiement cloud introuvable'

  const exists = localDb.prepare('SELECT id FROM paiements WHERE id = ?').get(paiementId)
  if (exists) {
    localDb.prepare(`
      UPDATE paiements SET
        eleve_id = ?, frais_annexe_id = ?, tranche_numero = ?, montant = ?,
        date_paiement = ?, mode_paiement = ?, recu_numero = ?, enregistre_par = ?
      WHERE id = ? AND ecole_id = ?
    `).run(
      row.eleve_id, row.frais_annexe_id, row.tranche_numero, row.montant,
      row.date_paiement, row.mode_paiement, row.recu_numero, row.enregistre_par,
      paiementId, ecoleId,
    )
  } else {
    localDb.prepare(`
      INSERT INTO paiements (
        id, ecole_id, eleve_id, frais_annexe_id, tranche_numero, montant,
        date_paiement, mode_paiement, recu_numero, enregistre_par, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paiementId, ecoleId, row.eleve_id, row.frais_annexe_id, row.tranche_numero, row.montant,
      row.date_paiement, row.mode_paiement, row.recu_numero, row.enregistre_par,
      row.created_at ?? new Date().toISOString(),
    )
  }
  return null
}

function copyNoteFromCloud(
  localDb: Database.Database,
  cloudDb: Database.Database,
  ecoleId: string,
  noteId: string,
): string | null {
  const row = cloudDb.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as Record<string, unknown> | undefined
  if (!row) return 'Note cloud introuvable'

  const exists = localDb.prepare('SELECT id FROM notes WHERE id = ?').get(noteId)
  if (exists) {
    localDb.prepare(`
      UPDATE notes SET eleve_id = ?, matiere_id = ?, periode = ?, note = ?, appreciation = ?, saisie_par = ?
      WHERE id = ? AND ecole_id = ?
    `).run(
      row.eleve_id, row.matiere_id, row.periode, row.note, row.appreciation, row.saisie_par,
      noteId, ecoleId,
    )
  } else {
    localDb.prepare(`
      INSERT INTO notes (id, ecole_id, eleve_id, matiere_id, periode, note, appreciation, saisie_par, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      noteId, ecoleId, row.eleve_id, row.matiere_id, row.periode, row.note,
      row.appreciation, row.saisie_par, row.created_at ?? new Date().toISOString(),
    )
  }
  return null
}

function copyTrancheFromCloud(
  localDb: Database.Database,
  cloudDb: Database.Database,
  ecoleId: string,
  entityId: string,
  cloudEcoleId: string,
): string | null {
  const parsed = parseTrancheKey(entityId)
  if (!parsed) return 'Clé tranche invalide'

  const row = cloudDb.prepare(`
    SELECT * FROM tranches_config
    WHERE ecole_id = ? AND classe_id = ? AND tranche_numero = ? AND annee_scolaire = ?
  `).get(cloudEcoleId, parsed.classe_id, parsed.tranche_numero, parsed.annee_scolaire) as Record<string, unknown> | undefined

  if (!row) return 'Tranche cloud introuvable'

  localDb.prepare(`
    DELETE FROM tranches_config
    WHERE ecole_id = ? AND classe_id = ? AND tranche_numero = ? AND annee_scolaire = ?
  `).run(ecoleId, parsed.classe_id, parsed.tranche_numero, parsed.annee_scolaire)

  localDb.prepare(`
    INSERT INTO tranches_config (
      id, ecole_id, classe_id, tranche_numero, montant_attendu, date_limite, annee_scolaire, annee_scolaire_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    row.id, ecoleId, parsed.classe_id, parsed.tranche_numero, row.montant_attendu,
    row.date_limite, parsed.annee_scolaire, row.annee_scolaire_id ?? null,
  )
  return null
}

function removeLocalPaiement(localDb: Database.Database, ecoleId: string, id: string): void {
  localDb.prepare('DELETE FROM paiements WHERE id = ? AND ecole_id = ?').run(id, ecoleId)
}

function removeLocalNote(localDb: Database.Database, ecoleId: string, id: string): void {
  localDb.prepare('DELETE FROM notes WHERE id = ? AND ecole_id = ?').run(id, ecoleId)
}

function removeLocalTranche(localDb: Database.Database, ecoleId: string, entityId: string): string | null {
  const parsed = parseTrancheKey(entityId)
  if (!parsed) return 'Clé tranche invalide'
  localDb.prepare(`
    DELETE FROM tranches_config
    WHERE ecole_id = ? AND classe_id = ? AND tranche_numero = ? AND annee_scolaire = ?
  `).run(ecoleId, parsed.classe_id, parsed.tranche_numero, parsed.annee_scolaire)
  return null
}

export async function applyBlobMergeDecision(
  localDb: Database.Database,
  cloudDb: Database.Database | null,
  ecoleId: string,
  cloudEcoleId: string | null,
  entity_type: string,
  entity_id: string,
  choice: 'local' | 'cloud',
  kind: 'local_only' | 'cloud_only' | 'both_modified',
): Promise<string | null> {
  if (choice === 'local') {
    if (kind === 'cloud_only') return null
    return null
  }

  // choice === 'cloud'
  if (kind === 'local_only') {
    if (entity_type === 'paiement') removeLocalPaiement(localDb, ecoleId, entity_id)
    else if (entity_type === 'note') removeLocalNote(localDb, ecoleId, entity_id)
    else if (entity_type === 'tranche') return removeLocalTranche(localDb, ecoleId, entity_id)
    return null
  }

  if (!cloudDb || !cloudEcoleId) return 'Snapshot cloud indisponible'

  if (entity_type === 'paiement') return copyPaiementFromCloud(localDb, cloudDb, ecoleId, entity_id)
  if (entity_type === 'note') return copyNoteFromCloud(localDb, cloudDb, ecoleId, entity_id)
  if (entity_type === 'tranche') return copyTrancheFromCloud(localDb, cloudDb, ecoleId, entity_id, cloudEcoleId)
  return null
}

export function isBlobEntityType(entity_type: string): boolean {
  return entity_type === 'paiement' || entity_type === 'note' || entity_type === 'tranche'
}
