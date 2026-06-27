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

  const today = new Date().toISOString().split('T')[0]

  const { data: licence, error } = await supabase
    .from('licences_central')
    .select('*')
    .eq('cle', cle)
    .eq('is_active', true)
    .gte('date_fin', today)
    .single()

  if (error || !licence) {
    const { data: existing } = await supabase
      .from('licences_central')
      .select('is_active, date_fin')
      .eq('cle', cle)
      .single()

    if (!existing) {
      return NextResponse.json({ valid: false, error: 'Clé invalide' })
    }
    if (!existing.is_active) {
      return NextResponse.json({ valid: false, error: 'Licence révoquée' })
    }
    return NextResponse.json({ valid: false, error: 'Licence expirée' })
  }

  return NextResponse.json({
    valid: true,
    plan: licence.plan,
    date_fin: licence.date_fin,
    ecole_slug: licence.ecole_slug,
    message: `Licence ${licence.plan} valide jusqu'au ${licence.date_fin}`
  })
}