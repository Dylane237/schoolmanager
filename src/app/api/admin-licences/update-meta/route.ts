import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin'
import { isAdminLicencesAuthed } from '@/lib/admin-licences-auth'
import { upsertEcoleCloud } from '@/lib/licence-cloud-sync'

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

  const { data, error } = await supabase
    .from('licences')
    .update({
      ecole_nom,
      ecole_slug: slug,
      ecole_id: slug,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await upsertEcoleCloud({ slug, nom: ecole_nom })

  return NextResponse.json({ licence: data })
}
