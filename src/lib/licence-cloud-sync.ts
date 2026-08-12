import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin'

export type LicenceCloudMeta = {
  cle: string
  ecole_nom: string
  ecole_slug: string
  machine_fingerprint?: string | null
  directeur_nom?: string | null
  telephone?: string | null
}

export async function upsertEcoleCloud(meta: {
  slug: string
  nom: string
  directeur_nom?: string | null
  telephone?: string | null
}) {
  if (!isSupabaseConfigured()) return

  const supabase = getSupabaseAdmin()!
  await supabase.from('ecoles').upsert(
    {
      slug: meta.slug,
      nom: meta.nom,
      directeur_nom: meta.directeur_nom ?? null,
      telephone: meta.telephone ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'slug' },
  )
}

/** UUID Postgres de l'école (colonne licences.ecole_id). */
export async function resolveEcoleUuidForSlug(ecoleSlug: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null

  const slug = ecoleSlug.trim()
  if (!slug) return null

  const { data } = await getSupabaseAdmin()!
    .from('ecoles')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  return data?.id ?? null
}

export async function linkLicenceRowToEcole(params: {
  licenceId: string
  ecole_slug: string
  ecole_nom?: string | null
  parrain_code?: string | null
  machine_fingerprint?: string | null
  setActivatedAt?: boolean
}): Promise<{ ok: boolean; error?: string; ecole_id?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase non configuré' }
  }

  const slug = params.ecole_slug.trim()
  if (!slug) return { ok: false, error: 'Slug école requis' }

  const ecoleUuid = await resolveEcoleUuidForSlug(slug)
  if (!ecoleUuid) return { ok: false, error: 'École introuvable dans Supabase' }

  const supabase = getSupabaseAdmin()!
  const { error } = await supabase
    .from('licences')
    .update({
      ecole_id: ecoleUuid,
      ecole_slug: slug,
      ...(params.ecole_nom != null ? { ecole_nom: params.ecole_nom } : {}),
      ...(params.parrain_code !== undefined
        ? { parrain_code: params.parrain_code?.startsWith('SM-') ? params.parrain_code : null }
        : {}),
      ...(params.machine_fingerprint !== undefined
        ? { machine_fingerprint: params.machine_fingerprint }
        : {}),
      ...(params.setActivatedAt ? { activated_at: new Date().toISOString() } : {}),
    })
    .eq('id', params.licenceId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, ecole_id: ecoleUuid }
}

/** Met à jour ecole_nom / ecole_slug sur une licence cloud + miroir ecoles. */
export async function syncLicenceMetaToCloud(
  meta: LicenceCloudMeta,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase non configuré' }
  }

  const cle = meta.cle.trim().toUpperCase()
  const ecole_nom = meta.ecole_nom.trim()
  const ecole_slug = meta.ecole_slug.trim()

  if (!cle || !ecole_nom || !ecole_slug) {
    return { ok: false, error: 'Paramètres incomplets' }
  }

  const supabase = getSupabaseAdmin()!

  const { data: licence, error: fetchErr } = await supabase
    .from('licences')
    .select('id, ecole_id, machine_fingerprint, is_active')
    .eq('cle_licence', cle)
    .single()

  if (fetchErr || !licence) {
    return { ok: false, error: 'Licence introuvable' }
  }

  if (!licence.is_active) {
    return { ok: false, error: 'Licence révoquée' }
  }

  await upsertEcoleCloud({
    slug: ecole_slug,
    nom: ecole_nom,
    directeur_nom: meta.directeur_nom,
    telephone: meta.telephone,
  })

  const linked = await linkLicenceRowToEcole({
    licenceId: licence.id,
    ecole_slug,
    ecole_nom,
    setActivatedAt: !licence.ecole_id,
  })

  if (!linked.ok) {
    return { ok: false, error: linked.error ?? 'Liaison licence échouée' }
  }

  return { ok: true }
}
