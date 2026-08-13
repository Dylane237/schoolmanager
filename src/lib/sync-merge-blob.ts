import 'server-only'
import type Database from 'better-sqlite3'
import { parseTrancheKey, parsePresenceKey } from './sync-diff-blob'

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

function copyPersonnelFromCloud(
  localDb: Database.Database,
  cloudDb: Database.Database,
  ecoleId: string,
  entityId: string,
): string | null {
  const row = cloudDb.prepare('SELECT * FROM personnel WHERE id = ?').get(entityId) as Record<string, unknown> | undefined
  if (!row) return 'Personnel cloud introuvable'

  const exists = localDb.prepare('SELECT id FROM personnel WHERE id = ?').get(entityId)
  if (exists) {
    localDb.prepare(`
      UPDATE personnel SET nom = ?, prenom = ?, telephone = ?, email = ?, type = ?,
        contrat = ?, date_embauche = ?, salaire = ?
      WHERE id = ? AND ecole_id = ?
    `).run(
      row.nom, row.prenom, row.telephone, row.email, row.type,
      row.contrat, row.date_embauche, row.salaire,
      entityId, ecoleId,
    )
  } else {
    localDb.prepare(`
      INSERT INTO personnel (
        id, ecole_id, nom, prenom, telephone, email, type, contrat, date_embauche, salaire, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entityId, ecoleId, row.nom, row.prenom, row.telephone, row.email, row.type,
      row.contrat, row.date_embauche, row.salaire, row.created_at ?? new Date().toISOString(),
    )
  }
  return null
}

function copyMatiereFromCloud(
  localDb: Database.Database,
  cloudDb: Database.Database,
  ecoleId: string,
  entityId: string,
): string | null {
  const row = cloudDb.prepare('SELECT * FROM matieres WHERE id = ?').get(entityId) as Record<string, unknown> | undefined
  if (!row) return 'Matière cloud introuvable'

  const exists = localDb.prepare('SELECT id FROM matieres WHERE id = ?').get(entityId)
  if (exists) {
    localDb.prepare(`
      UPDATE matieres SET classe_id = ?, nom = ?, nom_en = ?, coefficient = ?, section = ?, enseignant_id = ?
      WHERE id = ? AND ecole_id = ?
    `).run(
      row.classe_id, row.nom, row.nom_en, row.coefficient, row.section, row.enseignant_id,
      entityId, ecoleId,
    )
  } else {
    localDb.prepare(`
      INSERT INTO matieres (id, ecole_id, classe_id, nom, nom_en, coefficient, section, enseignant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entityId, ecoleId, row.classe_id, row.nom, row.nom_en, row.coefficient ?? 1,
      row.section, row.enseignant_id ?? null,
    )
  }
  return null
}

function copyFraisAnnexeFromCloud(
  localDb: Database.Database,
  cloudDb: Database.Database,
  ecoleId: string,
  entityId: string,
): string | null {
  const row = cloudDb.prepare('SELECT * FROM frais_annexes WHERE id = ?').get(entityId) as Record<string, unknown> | undefined
  if (!row) return 'Frais cloud introuvable'

  const exists = localDb.prepare('SELECT id FROM frais_annexes WHERE id = ?').get(entityId)
  if (exists) {
    localDb.prepare(`
      UPDATE frais_annexes SET classe_id = ?, label = ?, montant = ?, obligatoire = ?,
        type = ?, date_limite = ?, annee_scolaire = ?, annee_scolaire_id = ?
      WHERE id = ? AND ecole_id = ?
    `).run(
      row.classe_id, row.label, row.montant, row.obligatoire,
      row.type, row.date_limite, row.annee_scolaire, row.annee_scolaire_id ?? null,
      entityId, ecoleId,
    )
  } else {
    localDb.prepare(`
      INSERT INTO frais_annexes (
        id, ecole_id, classe_id, label, montant, obligatoire, type, date_limite, annee_scolaire, annee_scolaire_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entityId, ecoleId, row.classe_id, row.label, row.montant, row.obligatoire ?? 0,
      row.type ?? 'autre', row.date_limite, row.annee_scolaire, row.annee_scolaire_id ?? null,
    )
  }
  return null
}

function copyPresenceFromCloud(
  localDb: Database.Database,
  cloudDb: Database.Database,
  ecoleId: string,
  cloudEcoleId: string,
  entityId: string,
): string | null {
  const parsed = parsePresenceKey(entityId)
  if (!parsed) return 'Clé présence invalide'

  const row = cloudDb.prepare(`
    SELECT * FROM presences
    WHERE ecole_id = ? AND eleve_id = ? AND date = ?
  `).get(cloudEcoleId, parsed.eleve_id, parsed.date) as Record<string, unknown> | undefined

  if (!row) return 'Présence cloud introuvable'

  const existing = localDb.prepare(`
    SELECT id FROM presences WHERE ecole_id = ? AND eleve_id = ? AND date = ?
  `).get(ecoleId, parsed.eleve_id, parsed.date) as { id: string } | undefined

  if (existing) {
    localDb.prepare(`
      UPDATE presences SET statut = ?, note = ?, alerte_envoyee = ?
      WHERE id = ? AND ecole_id = ?
    `).run(row.statut, row.note, row.alerte_envoyee ?? 0, existing.id, ecoleId)
  } else {
    localDb.prepare(`
      INSERT INTO presences (id, ecole_id, eleve_id, date, statut, note, alerte_envoyee)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.id, ecoleId, parsed.eleve_id, parsed.date, row.statut, row.note, row.alerte_envoyee ?? 0,
    )
  }
  return null
}

function removeLocalPersonnel(localDb: Database.Database, ecoleId: string, id: string): void {
  localDb.prepare('DELETE FROM personnel WHERE id = ? AND ecole_id = ?').run(id, ecoleId)
}

function removeLocalMatiere(localDb: Database.Database, ecoleId: string, id: string): void {
  localDb.prepare('DELETE FROM matieres WHERE id = ? AND ecole_id = ?').run(id, ecoleId)
}

function removeLocalFraisAnnexe(localDb: Database.Database, ecoleId: string, id: string): void {
  localDb.prepare('DELETE FROM frais_annexes WHERE id = ? AND ecole_id = ?').run(id, ecoleId)
}

function removeLocalPresence(localDb: Database.Database, ecoleId: string, entityId: string): string | null {
  const parsed = parsePresenceKey(entityId)
  if (!parsed) return 'Clé présence invalide'
  localDb.prepare(`
    DELETE FROM presences WHERE ecole_id = ? AND eleve_id = ? AND date = ?
  `).run(ecoleId, parsed.eleve_id, parsed.date)
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
  allowDestructive = false,
): Promise<string | null> {
  if (choice === 'local') {
    if (kind === 'cloud_only') return null
    return null
  }

  // choice === 'cloud'
  if (kind === 'local_only') {
    if (!allowDestructive) return null
    if (entity_type === 'paiement') removeLocalPaiement(localDb, ecoleId, entity_id)
    else if (entity_type === 'note') removeLocalNote(localDb, ecoleId, entity_id)
    else if (entity_type === 'tranche') return removeLocalTranche(localDb, ecoleId, entity_id)
    else if (entity_type === 'personnel') removeLocalPersonnel(localDb, ecoleId, entity_id)
    else if (entity_type === 'matiere') removeLocalMatiere(localDb, ecoleId, entity_id)
    else if (entity_type === 'frais_annexe') removeLocalFraisAnnexe(localDb, ecoleId, entity_id)
    else if (entity_type === 'presence') return removeLocalPresence(localDb, ecoleId, entity_id)
    return null
  }

  if (!cloudDb || !cloudEcoleId) return 'Snapshot cloud indisponible'

  if (entity_type === 'paiement') return copyPaiementFromCloud(localDb, cloudDb, ecoleId, entity_id)
  if (entity_type === 'note') return copyNoteFromCloud(localDb, cloudDb, ecoleId, entity_id)
  if (entity_type === 'tranche') return copyTrancheFromCloud(localDb, cloudDb, ecoleId, entity_id, cloudEcoleId)
  if (entity_type === 'personnel') return copyPersonnelFromCloud(localDb, cloudDb, ecoleId, entity_id)
  if (entity_type === 'matiere') return copyMatiereFromCloud(localDb, cloudDb, ecoleId, entity_id)
  if (entity_type === 'frais_annexe') return copyFraisAnnexeFromCloud(localDb, cloudDb, ecoleId, entity_id)
  if (entity_type === 'presence') return copyPresenceFromCloud(localDb, cloudDb, ecoleId, cloudEcoleId, entity_id)
  return null
}

export function isBlobEntityType(entity_type: string): boolean {
  return entity_type === 'paiement'
    || entity_type === 'note'
    || entity_type === 'tranche'
    || entity_type === 'personnel'
    || entity_type === 'matiere'
    || entity_type === 'frais_annexe'
    || entity_type === 'presence'
}
