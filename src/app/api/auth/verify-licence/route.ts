import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cle = searchParams.get('cle')?.trim().toUpperCase()

  if (!cle) {
    return NextResponse.json({ valid: false, error: 'Clé requise' }, { status: 400 })
  }

  try {
    const { data: licence, error } = await supabase
      .from('licences')
      .select('cle_licence, type, date_fin, is_active, ecole_id')
      .eq('cle_licence', cle)
      .single()

    if (error || !licence) {
      return NextResponse.json({ valid: false, error: 'Licence introuvable' }, { status: 404 })
    }

    if (!licence.is_active) {
      return NextResponse.json({ valid: false, error: 'Licence révoquée' })
    }

    const today = new Date().toISOString().split('T')[0]
    if (licence.date_fin < today) {
      return NextResponse.json({ valid: false, error: 'Licence expirée' })
    }

    return NextResponse.json({
      valid: true,
      plan: licence.type,
      date_fin: licence.date_fin,
      message: `Licence ${licence.type} valide jusqu'au ${licence.date_fin}`,
    })

  } catch (err) {
    console.error('[verify-licence]', err)
    return NextResponse.json({ valid: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cle = searchParams.get('cle')?.trim().toUpperCase()

  if (!cle) {
    return NextResponse.json({ valid: false, error: 'Clé requise' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ valid: false, error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: licence, error } = await supabase
      .from('licences')
      .select('cle_licence, type, date_fin, is_active, ecole_id')
      .eq('cle_licence', cle)
      .single()

    if (error || !licence) {
      return NextResponse.json({ valid: false, error: 'Licence introuvable' }, { status: 404 })
    }

    if (!licence.is_active) {
      return NextResponse.json({ valid: false, error: 'Licence révoquée' })
    }

    const today = new Date().toISOString().split('T')[0]
    if (licence.date_fin < today) {
      return NextResponse.json({ valid: false, error: 'Licence expirée' })
    }

    return NextResponse.json({
      valid: true,
      plan: licence.type,
      date_fin: licence.date_fin,
      message: `Licence ${licence.type} valide jusqu'au ${licence.date_fin}`,
    })

  } catch (err) {
    console.error('[verify-licence]', err)
    return NextResponse.json({ valid: false, error: 'Erreur serveur' }, { status: 500 })
  }
}