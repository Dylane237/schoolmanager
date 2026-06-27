import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { cle, ecole_slug, ecole_nom } = await request.json()

    if (!cle || !ecole_slug) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Vérifier que la licence existe, est active et non utilisée
    const { data: licence, error } = await supabase
      .from('licences')
      .select('id, ecole_id, is_active, date_fin')
      .eq('cle_licence', cle.trim().toUpperCase())
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

    const today = new Date().toISOString().split('T')[0]
    if (licence.date_fin < today) {
      return NextResponse.json({ error: 'Licence expirée' }, { status: 400 })
    }

    // Créer l'école dans Supabase pour avoir un ecole_id
    const { data: ecole, error: ecoleError } = await supabase
      .from('ecoles')
      .insert({ nom: ecole_nom, slug: ecole_slug })
      .select('id')
      .single()

    if (ecoleError || !ecole) {
      return NextResponse.json({ error: 'Erreur création école' }, { status: 500 })
    }

    // Lier la licence à l'école
    await supabase
      .from('licences')
      .update({ ecole_id: ecole.id })
      .eq('id', licence.id)

    return NextResponse.json({ success: true, ecole_id: ecole.id })

  } catch (err) {
    console.error('[use-licence] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}