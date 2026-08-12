import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin'
import { isAdminLicencesAuthed } from '@/lib/admin-licences-auth'
import { upsertEcoleCloud, linkLicenceRowToEcole } from '@/lib/licence-cloud-sync'

export async function PUT(request: NextRequest) {
  if (!(await isAdminLicencesAuthed(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })
  }

  const body = await request.json()
  const id = String(body.id ?? '')
  const ecole_nom = String(body.ecole_nom ?? '').trim()
  const ecole_slug = String(body.ecole_slug ?? '').trim()

  if (!id || !ecole_nom) {
    return NextResponse.json({ error: 'id et ecole_nom requis' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()!
  const slug = ecole_slug || ecole_nom.toLowerCase().replace(/\s+/g, '-').slice(0, 64)

  await upsertEcoleCloud({ slug, nom: ecole_nom })

  const linked = await linkLicenceRowToEcole({
    licenceId: id,
    ecole_slug: slug,
    ecole_nom,
  })

  if (!linked.ok) {
    return NextResponse.json({ error: linked.error ?? 'Mise à jour échouée' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('licences')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ licence: data })
}
