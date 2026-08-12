import 'server-only'
import { downloadSchoolDbBuffer } from './db-blob-sync'
import { tryLoadBufferIntoMemoryDb } from './db-vercel'
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase-admin'
import { linkLicenceRowToEcole } from './licence-cloud-sync'

export interface ActiveCloudLicence {
  cle_licence: string | null
  type: string
  date_fin: string
}

/** Licence active dans Supabase (ecole_slug, ecole_id slug ou UUID école). */
export async function fetchActiveCloudLicenceRecord(
  ecoleSlug: string,
): Promise<ActiveCloudLicence | null> {
  if (!isSupabaseConfigured()) return null

  const slug = ecoleSlug.trim()
  if (!slug) return null

  const today = new Date().toISOString().split('T')[0]
  const sb = getSupabaseAdmin()!

  const { data: ecoleRow } = await sb
    .from('ecoles')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  const selectCols = 'id, cle_licence, type, date_fin, is_active, ecole_slug, ecole_id'

  const { data: bySlug } = await sb
    .from('licences')
    .select(selectCols)
    .eq('is_active', 1)
    .eq('ecole_slug', slug)
    .order('date_fin', { ascending: false })
    .limit(1)
    .maybeSingle()

  let data = bySlug

  if (!data && ecoleRow?.id) {
    const { data: byEcoleUuid } = await sb
      .from('licences')
      .select(selectCols)
      .eq('is_active', 1)
      .eq('ecole_id', ecoleRow.id)
      .order('date_fin', { ascending: false })
      .limit(1)
      .maybeSingle()
    data = byEcoleUuid
  }

  if (!data?.is_active || !data.date_fin) return null

  const dateFin = String(data.date_fin).slice(0, 10)
  if (dateFin < today) return null

  if (!data.ecole_slug || !data.ecole_id) {
    await linkLicenceRowToEcole({
      licenceId: data.id,
      ecole_slug: slug,
    })
  }

  return {
    cle_licence: data.cle_licence ?? null,
    type: data.type ?? 'standard',
    date_fin: dateFin,
  }
}

/** Lit la licence active depuis le blob SQLite cloud (source de vérité si Supabase non lié). */
export async function fetchLicenceFromSchoolBlob(
  ecoleSlug: string,
): Promise<ActiveCloudLicence | null> {
  try {
    const buffer = await downloadSchoolDbBuffer(ecoleSlug)
    if (!buffer?.length) return null

    const db = tryLoadBufferIntoMemoryDb(buffer)
    if (!db) {
      console.warn(`[licence-resolver] blob SQLite illisible pour "${ecoleSlug}" — fallback table licences`)
      return null
    }

    try {
      const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as {
        id: string
      } | undefined
      if (!ecole) return null

      const lic = db.prepare(`
        SELECT cle_licence, type, date_fin FROM licences
        WHERE ecole_id = ? AND is_active = 1 AND date_fin >= date('now')
        ORDER BY date_fin DESC LIMIT 1
      `).get(ecole.id) as { cle_licence: string; type: string; date_fin: string } | undefined

      if (!lic?.cle_licence) return null

      return {
        cle_licence: lic.cle_licence,
        type: lic.type ?? 'standard',
        date_fin: String(lic.date_fin).slice(0, 10),
      }
    } finally {
      db.close()
    }
  } catch (err) {
    console.warn(
      `[licence-resolver] échec lecture blob licence pour "${ecoleSlug}":`,
      err instanceof Error ? err.message : err,
    )
    return null
  }
}

async function backfillSupabaseLicenceLink(
  ecoleSlug: string,
  licence: ActiveCloudLicence,
): Promise<void> {
  if (!isSupabaseConfigured() || !licence.cle_licence) return

  const sb = getSupabaseAdmin()!
  const { data: row } = await sb
    .from('licences')
    .select('id')
    .eq('cle_licence', licence.cle_licence.trim().toUpperCase())
    .maybeSingle()

  if (!row?.id) return

  await linkLicenceRowToEcole({
    licenceId: row.id,
    ecole_slug: ecoleSlug,
    setActivatedAt: false,
  })
}

/**
 * Résout la licence active : table licences Supabase, puis blob SQLite.
 * Répare le lien Supabase si la licence n'existe que dans le blob.
 */
export async function resolveActiveCloudLicence(
  ecoleSlug: string,
): Promise<ActiveCloudLicence | null> {
  let licence = await fetchActiveCloudLicenceRecord(ecoleSlug)
  if (licence) return licence

  licence = await fetchLicenceFromSchoolBlob(ecoleSlug)
  if (licence?.cle_licence) {
    await backfillSupabaseLicenceLink(ecoleSlug, licence)
  }
  return licence
}

export async function fetchCloudLicenceForSlug(
  ecoleSlug: string,
): Promise<{ type: string; date_fin: string } | null> {
  const licence = await resolveActiveCloudLicence(ecoleSlug)
  if (!licence) return null
  return { type: licence.type, date_fin: licence.date_fin }
}
