import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin'
import { isAdminLicencesAuthed } from '@/lib/admin-licences-auth'

export async function GET(request: NextRequest) {
  if (!(await isAdminLicencesAuthed(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 503 })
  }

  const supabase = getSupabaseAdmin()!

  const { data: licences, error } = await supabase
    .from('licences')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = licences || []
  const ecoleIds = [...new Set(rows.map(l => l.ecole_id).filter(Boolean))] as string[]
  const ecoleSlugs = [...new Set(rows.map(l => l.ecole_slug).filter(Boolean))] as string[]

  let ecolesById: Record<string, { id: string; nom: string; slug?: string }> = {}
  let ecolesBySlug: Record<string, { id: string; nom: string; slug?: string }> = {}

  if (ecoleIds.length > 0) {
    const { data: byId } = await supabase.from('ecoles').select('id, nom, slug').in('id', ecoleIds)
    for (const e of byId || []) {
      ecolesById[e.id] = e
      if (e.slug) ecolesBySlug[e.slug] = e
    }
  }

  const missingSlugs = ecoleSlugs.filter(s => !ecolesBySlug[s])
  if (missingSlugs.length > 0) {
    const { data: bySlug } = await supabase.from('ecoles').select('id, nom, slug').in('slug', missingSlugs)
    for (const e of bySlug || []) {
      if (e.slug) ecolesBySlug[e.slug] = e
      ecolesById[e.id] = e
    }
  }

  const licencesWithEcoles = rows.map(l => {
    const fromId = l.ecole_id ? ecolesById[l.ecole_id] : null
    const fromSlug = l.ecole_slug ? ecolesBySlug[l.ecole_slug] : null
    const fromEcoleIdAsSlug = l.ecole_id ? ecolesBySlug[l.ecole_id] : null
    const ecole = fromId || fromSlug || fromEcoleIdAsSlug
    return {
      ...l,
      ecoles: ecole ? { nom: ecole.nom, slug: ecole.slug } : null,
      ecole_nom: l.ecole_nom || ecole?.nom || null,
      ecole_slug: l.ecole_slug || ecole?.slug || (fromEcoleIdAsSlug ? l.ecole_id : null),
    }
  })

  return NextResponse.json({ licences: licencesWithEcoles })
}
