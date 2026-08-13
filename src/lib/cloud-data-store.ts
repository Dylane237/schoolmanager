import { getSupabaseAdmin, isSupabaseConfigured } from './supabase-admin'
import { upsertEcoleCloud } from './licence-cloud-sync'
import type { SchoolSyncPayload } from './sync-payload'

const CHUNK = 400

const EXTENDED_CLOUD_TABLES = [
  'cloud_paiements',
  'cloud_notes',
  'cloud_tranches_config',
  'cloud_matieres',
  'cloud_personnel',
  'cloud_frais_annexes',
  'cloud_presences',
] as const

function isMissingCloudTableError(message: string | undefined): boolean {
  if (!message) return false
  return message.includes('does not exist')
    || message.includes('schema cache')
    || EXTENDED_CLOUD_TABLES.some(t => message.includes(t))
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function verifyLicenceForPush(payload: SchoolSyncPayload): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase non configuré' }

  const cle = payload.cle_licence.trim().toUpperCase()
  const supabase = getSupabaseAdmin()!

  const { data: licence, error } = await supabase
    .from('licences')
    .select('id, is_active, machine_fingerprint, ecole_slug')
    .eq('cle_licence', cle)
    .single()

  if (error || !licence) return { ok: false, error: 'Licence introuvable' }
  if (!licence.is_active) return { ok: false, error: 'Licence révoquée' }

  if (licence.ecole_slug && licence.ecole_slug !== payload.ecole_slug) {
    return { ok: false, error: 'Slug école non concordant' }
  }

  return { ok: true }
}

/** Refuse d'écraser des données structurées existantes par un blob vide. */
export async function shouldSkipStructuredRegression(
  ecoleSlug: string,
  incomingEleveCount: number,
): Promise<boolean> {
  if (incomingEleveCount > 0) return false
  if (!isSupabaseConfigured()) return false

  const supabase = getSupabaseAdmin()!
  const { count } = await supabase
    .from('cloud_eleves')
    .select('*', { count: 'exact', head: true })
    .eq('ecole_slug', ecoleSlug)

  return (count ?? 0) > 0
}

export async function upsertSchoolDataOnCloud(
  payload: SchoolSyncPayload,
): Promise<{ ok: boolean; error?: string; counts?: { eleves: number; classes: number } }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase non configuré' }
  }

  const auth = await verifyLicenceForPush(payload)
  if (!auth.ok) return auth

  const supabase = getSupabaseAdmin()!
  const slug = payload.ecole_slug
  const now = new Date().toISOString()

  await upsertEcoleCloud({
    slug,
    nom: payload.ecole_nom,
  })

  await supabase.from('cloud_classes').delete().eq('ecole_slug', slug)
  await supabase.from('cloud_eleves').delete().eq('ecole_slug', slug)
  await supabase.from('cloud_payment_summaries').delete().eq('ecole_slug', slug)

  for (const table of EXTENDED_CLOUD_TABLES) {
    const { error } = await supabase.from(table).delete().eq('ecole_slug', slug)
    if (error && !isMissingCloudTableError(error.message)) {
      return { ok: false, error: error.message }
    }
  }

  const classRows = payload.classes.map(c => ({
    ecole_slug: slug,
    local_id: c.local_id,
    nom: c.nom,
    section: c.section,
    niveau: c.niveau,
    annee_scolaire: c.annee_scolaire,
    capacite_max: c.capacite_max,
    nb_eleves: c.nb_eleves,
    enseignant_nom: c.enseignant_nom,
    synced_at: now,
  }))

  for (const batch of chunk(classRows, CHUNK)) {
    const { error } = await supabase.from('cloud_classes').insert(batch)
    if (error) return { ok: false, error: error.message }
  }

  const eleveRows = payload.eleves.map(e => ({
    ecole_slug: slug,
    local_id: e.local_id,
    numero_matricule: e.numero_matricule,
    nom: e.nom,
    prenom: e.prenom,
    sexe: e.sexe,
    section: e.section,
    statut: e.statut,
    classe_local_id: e.classe_local_id,
    classe_nom: e.classe_nom,
    date_naissance: e.date_naissance,
    parent_nom: e.parent_nom,
    parent_telephone: e.parent_telephone,
    total_paye: e.total_paye,
    total_attendu: e.total_attendu,
    synced_at: now,
  }))

  for (const batch of chunk(eleveRows, CHUNK)) {
    const { error } = await supabase.from('cloud_eleves').insert(batch)
    if (error) return { ok: false, error: error.message }
  }

  const payRows = payload.payment_summaries.map(p => ({
    ecole_slug: slug,
    eleve_local_id: p.eleve_local_id,
    numero_matricule: p.numero_matricule,
    nom: p.nom,
    prenom: p.prenom,
    classe_local_id: p.classe_local_id,
    classe_nom: p.classe_nom,
    total_attendu: p.total_attendu,
    total_paye: p.total_paye,
    total_reste: p.total_reste,
    statut: p.statut,
    synced_at: now,
  }))

  for (const batch of chunk(payRows, CHUNK)) {
    const { error } = await supabase.from('cloud_payment_summaries').insert(batch)
    if (error) return { ok: false, error: error.message }
  }

  const paiementRows = payload.paiements.map(p => ({
    ecole_slug: slug,
    local_id: p.local_id,
    eleve_local_id: p.eleve_local_id,
    tranche_numero: p.tranche_numero,
    montant: p.montant,
    date_paiement: p.date_paiement,
    mode_paiement: p.mode_paiement,
    recu_numero: p.recu_numero,
    frais_annexe_local_id: p.frais_annexe_local_id,
    synced_at: now,
  }))

  const noteRows = payload.notes.map(n => ({
    ecole_slug: slug,
    local_id: n.local_id,
    eleve_local_id: n.eleve_local_id,
    matiere_local_id: n.matiere_local_id,
    periode: n.periode,
    note: n.note,
    appreciation: n.appreciation,
    synced_at: now,
  }))

  const trancheRows = payload.tranches.map(t => ({
    ecole_slug: slug,
    local_id: t.local_id,
    classe_local_id: t.classe_local_id,
    tranche_numero: t.tranche_numero,
    montant_attendu: t.montant_attendu,
    date_limite: t.date_limite,
    annee_scolaire: t.annee_scolaire,
    synced_at: now,
  }))

  const matiereRows = payload.matieres.map(m => ({
    ecole_slug: slug,
    local_id: m.local_id,
    classe_local_id: m.classe_local_id,
    nom: m.nom,
    nom_en: m.nom_en,
    coefficient: m.coefficient,
    section: m.section,
    synced_at: now,
  }))

  const personnelRows = payload.personnel.map(p => ({
    ecole_slug: slug,
    local_id: p.local_id,
    nom: p.nom,
    prenom: p.prenom,
    telephone: p.telephone,
    email: p.email,
    type: p.type,
    contrat: p.contrat,
    date_embauche: p.date_embauche,
    salaire: p.salaire,
    synced_at: now,
  }))

  const fraisRows = payload.frais_annexes.map(f => ({
    ecole_slug: slug,
    local_id: f.local_id,
    classe_local_id: f.classe_local_id,
    label: f.label,
    montant: f.montant,
    obligatoire: f.obligatoire,
    type: f.type,
    date_limite: f.date_limite,
    annee_scolaire: f.annee_scolaire,
    synced_at: now,
  }))

  const presenceRows = payload.presences.map(p => ({
    ecole_slug: slug,
    local_id: p.local_id,
    eleve_local_id: p.eleve_local_id,
    date: p.date,
    statut: p.statut,
    note: p.note,
    synced_at: now,
  }))

  async function insertExtendedRows(
    table: typeof EXTENDED_CLOUD_TABLES[number],
    rows: Record<string, unknown>[],
  ): Promise<{ ok: boolean; error?: string }> {
    if (!rows.length) return { ok: true }
    for (const batch of chunk(rows, CHUNK)) {
      const { error } = await supabase.from(table).insert(batch as never)
      if (error) {
        if (isMissingCloudTableError(error.message)) return { ok: true }
        return { ok: false, error: error.message }
      }
    }
    return { ok: true }
  }

  const ext = await insertExtendedRows('cloud_paiements', paiementRows)
  if (!ext.ok) return ext

  const extNotes = await insertExtendedRows('cloud_notes', noteRows)
  if (!extNotes.ok) return extNotes

  const extTranches = await insertExtendedRows('cloud_tranches_config', trancheRows)
  if (!extTranches.ok) return extTranches

  const extMatieres = await insertExtendedRows('cloud_matieres', matiereRows)
  if (!extMatieres.ok) return extMatieres

  const extPersonnel = await insertExtendedRows('cloud_personnel', personnelRows)
  if (!extPersonnel.ok) return extPersonnel

  const extFrais = await insertExtendedRows('cloud_frais_annexes', fraisRows)
  if (!extFrais.ok) return extFrais

  const extPresences = await insertExtendedRows('cloud_presences', presenceRows)
  if (!extPresences.ok) return extPresences

  const elevesTotal = payload.eleves.length
  const elevesActif = payload.eleves.filter(e => e.statut === 'actif').length

  const { error: metaErr } = await supabase.from('cloud_sync_meta').upsert(
    {
      ecole_slug: slug,
      annee_scolaire: payload.annee_scolaire,
      synced_at: now,
      eleves_count: elevesActif,
      classes_count: payload.classes.length,
      machine_fingerprint: payload.machine_fingerprint,
      app_version: process.env.SM_APP_VERSION ?? null,
      dashboard_stats: {
        ...payload.dashboard_stats,
        eleves_total: elevesTotal,
        eleves_actif: elevesActif,
        entity_counts: payload.entity_counts,
      },
    },
    { onConflict: 'ecole_slug' },
  )

  if (metaErr) return { ok: false, error: metaErr.message }

  return {
    ok: true,
    counts: { eleves: elevesTotal, classes: classRows.length },
  }
}

export interface CloudSyncStatus {
  configured: boolean
  synced: boolean
  synced_at: string | null
  annee_scolaire: string | null
  eleves_count: number
  classes_count: number
}

export async function fetchCloudSyncStatus(ecoleSlug: string): Promise<CloudSyncStatus> {
  if (!isSupabaseConfigured()) {
    return { configured: false, synced: false, synced_at: null, annee_scolaire: null, eleves_count: 0, classes_count: 0 }
  }

  const supabase = getSupabaseAdmin()!
  const { data } = await supabase
    .from('cloud_sync_meta')
    .select('synced_at, annee_scolaire, eleves_count, classes_count')
    .eq('ecole_slug', ecoleSlug)
    .maybeSingle()

  if (!data) {
    return { configured: true, synced: false, synced_at: null, annee_scolaire: null, eleves_count: 0, classes_count: 0 }
  }

  return {
    configured: true,
    synced: true,
    synced_at: data.synced_at,
    annee_scolaire: data.annee_scolaire,
    eleves_count: data.eleves_count ?? 0,
    classes_count: data.classes_count ?? 0,
  }
}
