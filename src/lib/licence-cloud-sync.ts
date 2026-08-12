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

  const { error: updateErr } = await supabase
    .from('licences')
    .update({
      ecole_id: ecole_slug,
      ecole_slug,
      ecole_nom,
      ...(licence.ecole_id ? {} : { activated_at: new Date().toISOString() }),
    })
    .eq('id', licence.id)

  if (updateErr) {
    return { ok: false, error: updateErr.message }
  }

  await upsertEcoleCloud({
    slug: ecole_slug,
    nom: ecole_nom,
    directeur_nom: meta.directeur_nom,
    telephone: meta.telephone,
  })

  return { ok: true }
}
