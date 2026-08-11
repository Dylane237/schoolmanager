import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin'
import { isAdminLicencesAuthed } from '@/lib/admin-licences-auth'

function isUuid(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value)
}

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

  const slugCandidates = new Set<string>()
  for (const l of rows) {
    if (l.ecole_slug) slugCandidates.add(l.ecole_slug)
    if (l.ecole_id && !isUuid(l.ecole_id)) slugCandidates.add(l.ecole_id)
  }

  const ecolesBySlug: Record<string, { nom: string; slug: string; directeur_nom?: string; telephone?: string }> = {}

  if (slugCandidates.size > 0) {
    const { data: ecoles } = await supabase
      .from('ecoles')
      .select('nom, slug, directeur_nom, telephone')
      .in('slug', [...slugCandidates])

    for (const e of ecoles || []) {
      if (e.slug) ecolesBySlug[e.slug] = e
    }
  }

  const licencesWithEcoles = rows.map(l => {
    const slugKey = l.ecole_slug || (l.ecole_id && !isUuid(l.ecole_id) ? l.ecole_id : null)
    const ecole = slugKey ? ecolesBySlug[slugKey] : null

    return {
      ...l,
      ecoles: ecole ? { nom: ecole.nom, slug: ecole.slug } : null,
      ecole_nom: l.ecole_nom || ecole?.nom || null,
      ecole_slug: slugKey || ecole?.slug || null,
      directeur_nom: ecole?.directeur_nom ?? null,
      telephone: ecole?.telephone ?? null,
    }
  })

  return NextResponse.json({ licences: licencesWithEcoles })
}
