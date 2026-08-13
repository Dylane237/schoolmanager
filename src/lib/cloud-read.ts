import { isSupabaseConfigured } from './supabase-admin'
import { fetchCloudSyncStatus, type CloudSyncStatus } from './cloud-data-store'

/** @deprecated Parité complète — toujours false. */
export function isCloudReadMode(): boolean {
  return false
}

export async function getCloudSyncStatus(ecoleSlug: string): Promise<CloudSyncStatus> {
  return fetchCloudSyncStatus(ecoleSlug)
}

export async function fetchCloudEleves(
  ecoleSlug: string,
  filters?: { classe_id?: string | null; section?: string; search?: string; statut_paiement?: string },
) {
  if (!isSupabaseConfigured()) return []

  const { getSupabaseAdmin } = await import('./supabase-admin')
  const supabase = getSupabaseAdmin()!

  let query = supabase
    .from('cloud_eleves')
    .select('*')
    .eq('ecole_slug', ecoleSlug)
    .eq('statut', 'actif')
    .order('nom')

  if (filters?.classe_id === '__none__') {
    query = query.is('classe_local_id', null)
  } else if (filters?.classe_id) {
    query = query.eq('classe_local_id', filters.classe_id)
  }
  if (filters?.section) query = query.eq('section', filters.section)

  const { data, error } = await query
  if (error || !data) return []

  let rows = data.map(row => ({
    id: row.local_id,
    numero_matricule: row.numero_matricule,
    nom: row.nom,
    prenom: row.prenom,
    sexe: row.sexe,
    section: row.section,
    statut: row.statut,
    classe_id: row.classe_local_id,
    classe_nom: row.classe_nom,
    date_naissance: row.date_naissance,
    photo_url: null,
    parent_nom: row.parent_nom,
    parent_telephone: row.parent_telephone,
    total_paye: Number(row.total_paye ?? 0),
    total_attendu: Number(row.total_attendu ?? 0),
  }))

  if (filters?.search) {
    const q = filters.search.toLowerCase()
    rows = rows.filter(r =>
      r.nom.toLowerCase().includes(q)
      || r.prenom.toLowerCase().includes(q)
      || (r.numero_matricule ?? '').toLowerCase().includes(q)
    )
  }

  if (filters?.statut_paiement && filters.statut_paiement !== 'tous') {
    rows = rows.filter(el => {
      const reste = el.total_attendu - el.total_paye
      if (filters.statut_paiement === 'paye') return reste <= 0
      if (filters.statut_paiement === 'partiel') return reste > 0 && el.total_paye > 0
      if (filters.statut_paiement === 'impaye') return el.total_paye === 0
      return true
    })
  }

  return rows
}

export async function fetchCloudClasses(ecoleSlug: string) {
  if (!isSupabaseConfigured()) return []

  const { getSupabaseAdmin } = await import('./supabase-admin')
  const supabase = getSupabaseAdmin()!

  const { data, error } = await supabase
    .from('cloud_classes')
    .select('*')
    .eq('ecole_slug', ecoleSlug)
    .order('section')
    .order('nom')

  if (error || !data) return []

  return data.map(row => ({
    id: row.local_id,
    nom: row.nom,
    section: row.section,
    niveau: row.niveau,
    annee_scolaire: row.annee_scolaire,
    capacite_max: row.capacite_max,
    nb_eleves: row.nb_eleves,
    enseignant_nom: row.enseignant_nom?.split(' ').pop() ?? null,
    enseignant_prenom: row.enseignant_nom?.split(' ')[0] ?? null,
    personnel_id: null,
  }))
}

export async function fetchCloudPaymentSituations(
  ecoleSlug: string,
  filters?: { classeId?: string; search?: string; statut?: string },
) {
  if (!isSupabaseConfigured()) return { situations: [], annee_scolaire: null as string | null }

  const { getSupabaseAdmin } = await import('./supabase-admin')
  const supabase = getSupabaseAdmin()!

  const { data: meta } = await supabase
    .from('cloud_sync_meta')
    .select('annee_scolaire')
    .eq('ecole_slug', ecoleSlug)
    .maybeSingle()

  let query = supabase
    .from('cloud_payment_summaries')
    .select('*')
    .eq('ecole_slug', ecoleSlug)
    .order('nom')

  if (filters?.classeId) query = query.eq('classe_local_id', filters.classeId)

  const { data, error } = await query
  if (error || !data) return { situations: [], annee_scolaire: meta?.annee_scolaire ?? null }

  let rows = data.map(row => ({
    eleve_id: row.eleve_local_id,
    nom: row.nom,
    prenom: row.prenom,
    numero_matricule: row.numero_matricule,
    classe_id: row.classe_local_id,
    classe_nom: row.classe_nom,
    total_attendu: Number(row.total_attendu ?? 0),
    total_paye: Number(row.total_paye ?? 0),
    total_reste: Number(row.total_reste ?? 0),
    statut: row.statut,
    tranches: [],
    frais_examen: null,
  }))

  if (filters?.search) {
    const q = filters.search.toLowerCase()
    rows = rows.filter(r =>
      r.nom.toLowerCase().includes(q)
      || r.prenom.toLowerCase().includes(q)
      || (r.numero_matricule ?? '').toLowerCase().includes(q)
    )
  }

  if (filters?.statut) {
    rows = rows.filter(r => r.statut === filters.statut)
  }

  return { situations: rows, annee_scolaire: meta?.annee_scolaire ?? null }
}

export async function fetchCloudDashboardStats(ecoleSlug: string) {
  if (!isSupabaseConfigured()) return null

  const { getSupabaseAdmin } = await import('./supabase-admin')
  const supabase = getSupabaseAdmin()!

  const { data } = await supabase
    .from('cloud_sync_meta')
    .select('dashboard_stats, synced_at, annee_scolaire')
    .eq('ecole_slug', ecoleSlug)
    .maybeSingle()

  if (!data?.dashboard_stats) return null
  return {
    stats: data.dashboard_stats,
    synced_at: data.synced_at as string,
    annee_scolaire: data.annee_scolaire as string | null,
  }
}

export async function resolveEcoleFromCloud(slug: string) {
  if (!isSupabaseConfigured()) return null

  const { getSupabaseAdmin } = await import('./supabase-admin')
  const supabase = getSupabaseAdmin()!

  const { data } = await supabase
    .from('ecoles')
    .select('slug, nom')
    .eq('slug', slug)
    .maybeSingle()

  if (!data) return null
  return { id: data.slug, nom: data.nom, logo_url: null }
}

async function fetchCloudTable<T>(
  ecoleSlug: string,
  table: string,
): Promise<T[]> {
  if (!isSupabaseConfigured()) return []

  const { getSupabaseAdmin } = await import('./supabase-admin')
  const supabase = getSupabaseAdmin()!

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('ecole_slug', ecoleSlug)

  if (error || !data) return []
  return data as T[]
}

export async function fetchCloudPaiements(ecoleSlug: string) {
  return fetchCloudTable<{
    local_id: string
    eleve_local_id: string | null
    tranche_numero: number | null
    montant: number
    date_paiement: string | null
    mode_paiement: string | null
    recu_numero: string | null
    frais_annexe_local_id: string | null
  }>(ecoleSlug, 'cloud_paiements')
}

export async function fetchCloudNotes(ecoleSlug: string) {
  return fetchCloudTable<{
    local_id: string
    eleve_local_id: string | null
    matiere_local_id: string | null
    periode: string
    note: number | null
    appreciation: string | null
  }>(ecoleSlug, 'cloud_notes')
}

export async function fetchCloudTranches(ecoleSlug: string) {
  return fetchCloudTable<{
    local_id: string
    classe_local_id: string | null
    tranche_numero: number
    montant_attendu: number
    date_limite: string | null
    annee_scolaire: string
  }>(ecoleSlug, 'cloud_tranches_config')
}

export async function fetchCloudMatieres(ecoleSlug: string) {
  return fetchCloudTable<{
    local_id: string
    classe_local_id: string | null
    nom: string
    nom_en: string | null
    coefficient: number
    section: string | null
  }>(ecoleSlug, 'cloud_matieres')
}

export async function fetchCloudPersonnel(ecoleSlug: string) {
  return fetchCloudTable<{
    local_id: string
    nom: string
    prenom: string | null
    telephone: string | null
    email: string | null
    type: string | null
    contrat: string | null
    date_embauche: string | null
    salaire: number | null
  }>(ecoleSlug, 'cloud_personnel')
}

export async function fetchCloudFraisAnnexes(ecoleSlug: string) {
  return fetchCloudTable<{
    local_id: string
    classe_local_id: string | null
    label: string
    montant: number
    obligatoire: number
    type: string | null
    date_limite: string | null
    annee_scolaire: string
  }>(ecoleSlug, 'cloud_frais_annexes')
}

export async function fetchCloudPresences(ecoleSlug: string) {
  return fetchCloudTable<{
    local_id: string
    eleve_local_id: string | null
    date: string | null
    statut: string | null
    note: string | null
  }>(ecoleSlug, 'cloud_presences')
}
