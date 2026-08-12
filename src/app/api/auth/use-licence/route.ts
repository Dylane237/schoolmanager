import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin'
import { upsertEcoleCloud, linkLicenceRowToEcole } from '@/lib/licence-cloud-sync'

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })
    }

    const body = await request.json()
    const cle = String(body.cle ?? '').trim().toUpperCase()
    const ecole_slug = String(body.ecole_slug ?? '').trim() || null
    const ecole_nom = String(body.ecole_nom ?? '').trim() || null
    const parrain_code = String(body.parrain_code ?? body.code_parrain ?? '').trim().toUpperCase() || null
    const machine_fingerprint = String(body.machine_fingerprint ?? '').trim() || null

    if (!cle) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()!

    const { data: licence, error } = await supabase
      .from('licences')
      .select('id, ecole_id, is_active, date_fin')
      .eq('cle_licence', cle)
      .single()

    if (error || !licence) {
      return NextResponse.json({ error: 'Clé invalide' }, { status: 400 })
    }

    if (!licence.is_active) {
      return NextResponse.json({ error: 'Licence révoquée' }, { status: 400 })
    }

    if (licence.ecole_id) {
      return NextResponse.json({ error: 'Clé déjà utilisée' }, { status: 400 })
    }

    if (!ecole_slug) {
      return NextResponse.json({ error: 'ecole_slug requis' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    if (licence.date_fin < today) {
      return NextResponse.json({ error: 'Licence expirée' }, { status: 400 })
    }

    if (ecole_slug && ecole_nom) {
      await upsertEcoleCloud({
        slug: ecole_slug,
        nom: ecole_nom,
      })
    }

    const linked = await linkLicenceRowToEcole({
      licenceId: licence.id,
      ecole_slug: ecole_slug ?? '',
      ecole_nom,
      parrain_code,
      machine_fingerprint,
      setActivatedAt: true,
    })

    if (!linked.ok) {
      return NextResponse.json({ error: linked.error ?? 'Activation licence échouée' }, { status: 400 })
    }

    if (parrain_code?.startsWith('SM-') && ecole_slug && ecole_nom) {
      await supabase
        .from('parrainages')
        .update({
          statut: 'abonnement_actif',
          filleul_ecole_slug: ecole_slug,
          filleul_ecole_nom: ecole_nom,
          updated_at: new Date().toISOString(),
        })
        .eq('parrain_code', parrain_code)
        .eq('statut', 'en_cours')
        .ilike('contact_ecole', ecole_nom)
    }

    return NextResponse.json({ success: true, ecole_id: linked.ecole_id })

  } catch (err) {
    console.error('[use-licence] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
