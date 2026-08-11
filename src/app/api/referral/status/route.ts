import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin'

/** Cloud only — statuts parrainage pour une école parrain (sync desktop). */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ parrainages: [] })
  }

  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code || !code.startsWith('SM-')) {
    return NextResponse.json({ error: 'Code parrain invalide' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()!
  const { data, error } = await supabase
    .from('parrainages')
    .select(`
      id, local_id, parrain_code, contact_nom, contact_ecole, contact_telephone, notes,
      statut, montant_abonnement, commission_pct, commission_montant,
      filleul_ecole_slug, filleul_ecole_nom, created_at, updated_at
    `)
    .eq('parrain_code', code)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ parrainages: data ?? [] })
}
