import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin'
import { COMMISSION_PCT } from '@/lib/referral-utils'
import { checkRateLimit, rateLimitResponse, verifyServerSecret } from '@/lib/rate-limit'

/** Cloud only — réception d'un lead parrainage depuis une installation desktop. */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(`referral-leads:${ip}`, 30, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec ?? 60)

  if (!verifyServerSecret(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })
  }

  const body = await request.json()
  const parrain_code = String(body.parrain_code ?? '').trim().toUpperCase()
  const parrain_ecole_nom = String(body.parrain_ecole_nom ?? '').trim()
  const contact_nom = String(body.contact_nom ?? '').trim()
  const contact_telephone = String(body.contact_telephone ?? '').trim()

  if (!parrain_code.startsWith('SM-') || !parrain_ecole_nom || !contact_nom || !contact_telephone) {
    return NextResponse.json({ error: 'Données parrainage invalides' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()!
  const row = {
    local_id: body.local_id ? String(body.local_id) : null,
    parrain_code,
    parrain_ecole_slug: String(body.parrain_ecole_slug ?? '').trim() || null,
    parrain_ecole_nom,
    parrain_directeur_nom: String(body.parrain_directeur_nom ?? '').trim() || null,
    contact_nom,
    contact_ecole: String(body.contact_ecole ?? '').trim() || null,
    contact_telephone,
    notes: String(body.notes ?? '').trim() || null,
    commission_pct: COMMISSION_PCT,
    updated_at: new Date().toISOString(),
  }

  if (row.local_id) {
    const { data: existing } = await supabase
      .from('parrainages')
      .select('id, statut')
      .eq('parrain_code', parrain_code)
      .eq('local_id', row.local_id)
      .maybeSingle()

    if (existing) {
      if (existing.statut !== 'en_cours') {
        return NextResponse.json({ id: existing.id, synced: true })
      }
      const { data, error } = await supabase
        .from('parrainages')
        .update(row)
        .eq('id', existing.id)
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ id: data.id, synced: true })
    }
  }

  const { data, error } = await supabase
    .from('parrainages')
    .insert({ ...row, statut: 'en_cours' })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, synced: true })
}
