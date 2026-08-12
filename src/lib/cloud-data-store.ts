import { getSupabaseAdmin, isSupabaseConfigured } from './supabase-admin'
import { upsertEcoleCloud } from './licence-cloud-sync'
import type { SchoolSyncPayload } from './sync-payload'

const CHUNK = 400

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

  const { error: metaErr } = await supabase.from('cloud_sync_meta').upsert(
    {
      ecole_slug: slug,
      annee_scolaire: payload.annee_scolaire,
      synced_at: now,
      eleves_count: payload.eleves.filter(e => e.statut === 'actif').length,
      classes_count: payload.classes.length,
      machine_fingerprint: payload.machine_fingerprint,
      app_version: process.env.SM_APP_VERSION ?? null,
      dashboard_stats: payload.dashboard_stats,
    },
    { onConflict: 'ecole_slug' },
  )

  if (metaErr) return { ok: false, error: metaErr.message }

  return {
    ok: true,
    counts: { eleves: eleveRows.length, classes: classRows.length },
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
