import 'server-only'
import type Database from 'better-sqlite3'
import type { SyncDiffItem, SyncDiffKind } from './sync-diff-types'
import type { SyncEntityType } from './sync-changelog'

type PaiementRow = {
  id: string
  recu_numero: string | null
  montant: number
  date_paiement: string | null
  tranche_numero: number | null
  eleve_label: string
}

type NoteRow = {
  id: string
  note: number | null
  periode: string
  matiere_nom: string | null
  eleve_label: string
}

type TrancheRow = {
  key: string
  classe_id: string
  tranche_numero: number
  annee_scolaire: string
  montant_attendu: number
  date_limite: string | null
  classe_nom: string | null
}

function diffFields(
  local: Record<string, string | null>,
  cloud: Record<string, string | null>,
  keys: string[],
): string[] {
  return keys.filter(k => (local[k] ?? '') !== (cloud[k] ?? ''))
}

function pushDiffItem(
  items: SyncDiffItem[],
  entity_type: SyncEntityType,
  entity_id: string,
  label: string,
  kind: SyncDiffKind,
  local_summary: string | null,
  cloud_summary: string | null,
  fields_changed: string[],
): void {
  items.push({
    entity_type,
    entity_id,
    label,
    kind,
    local_summary,
    cloud_summary,
    fields_changed,
  })
}

function diffGeneric<T>(
  entity_type: SyncEntityType,
  local: Map<string, T>,
  cloud: Map<string, T>,
  labelFn: (row: T) => string,
  summaryFn: (row: T) => string,
  compareFn: (local: T, cloud: T) => string[],
): SyncDiffItem[] {
  const items: SyncDiffItem[] = []
  const ids = new Set([...local.keys(), ...cloud.keys()])

  for (const id of ids) {
    const l = local.get(id)
    const c = cloud.get(id)

    if (l && !c) {
      pushDiffItem(items, entity_type, id, labelFn(l), 'local_only', summaryFn(l), null, [])
      continue
    }
    if (c && !l) {
      pushDiffItem(items, entity_type, id, labelFn(c), 'cloud_only', null, summaryFn(c), [])
      continue
    }
    if (!l || !c) continue

    const changed = compareFn(l, c)
    if (changed.length > 0) {
      pushDiffItem(
        items,
        entity_type,
        id,
        labelFn(l),
        'both_modified',
        summaryFn(l),
        summaryFn(c),
        changed,
      )
    }
  }

  return items
}

function readPaiements(db: Database.Database, ecoleId: string): Map<string, PaiementRow> {
  const rows = db.prepare(`
    SELECT p.id, p.recu_numero, p.montant, p.date_paiement, p.tranche_numero,
      TRIM(COALESCE(e.prenom, '') || ' ' || COALESCE(e.nom, '')) as eleve_label
    FROM paiements p
    LEFT JOIN eleves e ON e.id = p.eleve_id
    WHERE p.ecole_id = ?
  `).all(ecoleId) as PaiementRow[]

  return new Map(rows.map(r => [r.id, r]))
}

function readNotes(db: Database.Database, ecoleId: string): Map<string, NoteRow> {
  const rows = db.prepare(`
    SELECT n.id, n.note, n.periode, m.nom as matiere_nom,
      TRIM(COALESCE(e.prenom, '') || ' ' || COALESCE(e.nom, '')) as eleve_label
    FROM notes n
    LEFT JOIN matieres m ON m.id = n.matiere_id
    LEFT JOIN eleves e ON e.id = n.eleve_id
    WHERE n.ecole_id = ?
  `).all(ecoleId) as NoteRow[]

  return new Map(rows.map(r => [r.id, r]))
}

function trancheKey(classeId: string, numero: number, annee: string): string {
  return `${classeId}:${numero}:${annee}`
}

function readTranches(db: Database.Database, ecoleId: string): Map<string, TrancheRow> {
  const rows = db.prepare(`
    SELECT tc.classe_id, tc.tranche_numero, tc.annee_scolaire, tc.montant_attendu, tc.date_limite,
      c.nom as classe_nom
    FROM tranches_config tc
    LEFT JOIN classes c ON c.id = tc.classe_id
    WHERE tc.ecole_id = ?
  `).all(ecoleId) as Omit<TrancheRow, 'key'>[]

  const map = new Map<string, TrancheRow>()
  for (const r of rows) {
    const key = trancheKey(r.classe_id, r.tranche_numero, r.annee_scolaire)
    map.set(key, { ...r, key })
  }
  return map
}

function paiementLabel(p: PaiementRow): string {
  const recu = p.recu_numero ? ` ${p.recu_numero}` : ''
  return `Paiement ${p.montant} F${recu} — ${p.eleve_label || 'Élève'}`
}

function paiementSummary(p: PaiementRow): string {
  const tr = p.tranche_numero ? `, tranche ${p.tranche_numero}` : ''
  return `${p.montant} F le ${p.date_paiement ?? '?'}${tr}`
}

function noteLabel(n: NoteRow): string {
  return `Note ${n.eleve_label} — ${n.matiere_nom ?? 'Matière'} (${n.periode})`
}

function noteSummary(n: NoteRow): string {
  return `${n.note ?? '—'}/100 · ${n.periode}`
}

function trancheLabel(t: TrancheRow): string {
  return `Tranche ${t.tranche_numero} — ${t.classe_nom ?? t.classe_id}`
}

function trancheSummary(t: TrancheRow): string {
  const lim = t.date_limite ? `, limite ${t.date_limite}` : ''
  return `${t.montant_attendu} F${lim} · ${t.annee_scolaire}`
}

/** Diff paiements / notes / tranches entre bureau et blob cloud. */
export function diffBlobEntities(
  localDb: Database.Database,
  cloudDb: Database.Database,
  ecoleId: string,
  cloudEcoleId: string,
): SyncDiffItem[] {
  const localP = readPaiements(localDb, ecoleId)
  const cloudP = readPaiements(cloudDb, cloudEcoleId)
  const localN = readNotes(localDb, ecoleId)
  const cloudN = readNotes(cloudDb, cloudEcoleId)
  const localT = readTranches(localDb, ecoleId)
  const cloudT = readTranches(cloudDb, cloudEcoleId)

  return [
    ...diffGeneric('paiement', localP, cloudP, paiementLabel, paiementSummary, (l, c) =>
      diffFields(
        {
          montant: String(l.montant),
          date: l.date_paiement,
          tranche: l.tranche_numero != null ? String(l.tranche_numero) : null,
        },
        {
          montant: String(c.montant),
          date: c.date_paiement,
          tranche: c.tranche_numero != null ? String(c.tranche_numero) : null,
        },
        ['montant', 'date', 'tranche'],
      )),
    ...diffGeneric('note', localN, cloudN, noteLabel, noteSummary, (l, c) =>
      diffFields(
        { note: l.note != null ? String(l.note) : null, periode: l.periode },
        { note: c.note != null ? String(c.note) : null, periode: c.periode },
        ['note', 'periode'],
      )),
    ...diffGeneric('tranche', localT, cloudT, trancheLabel, trancheSummary, (l, c) =>
      diffFields(
        {
          montant: String(l.montant_attendu),
          limite: l.date_limite,
        },
        {
          montant: String(c.montant_attendu),
          limite: c.date_limite,
        },
        ['montant', 'limite'],
      )),
  ]
}

export function parseTrancheKey(entityId: string): {
  classe_id: string
  tranche_numero: number
  annee_scolaire: string
} | null {
  const parts = entityId.split(':')
  if (parts.length < 3) return null
  const annee = parts.pop()!
  const numero = Number(parts.pop())
  const classe_id = parts.join(':')
  if (!classe_id || Number.isNaN(numero) || !annee) return null
  return { classe_id, tranche_numero: numero, annee_scolaire: annee }
}
