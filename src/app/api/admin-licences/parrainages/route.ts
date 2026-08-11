import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin'
import { isAdminLicencesAuthed } from '@/lib/admin-licences-auth'
import type { ParrainageStatut } from '@/lib/referral-utils'

export async function GET(request: NextRequest) {
  if (!(await isAdminLicencesAuthed(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })
  }

  const supabase = getSupabaseAdmin()!
  const statut = request.nextUrl.searchParams.get('statut')

  let query = supabase
    .from('parrainages')
    .select('*')
    .order('created_at', { ascending: false })

  if (statut) query = query.eq('statut', statut)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const parrainages = data ?? []
  const stats = {
    enCours: parrainages.filter(p => p.statut === 'en_cours').length,
    actifs: parrainages.filter(p => p.statut === 'abonnement_actif').length,
    verses: parrainages.filter(p => p.statut === 'commission_versee').length,
    totalCommission: parrainages
      .filter(p => p.commission_montant != null)
      .reduce((s, p) => s + Number(p.commission_montant), 0),
  }

  return NextResponse.json({ parrainages, stats })
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminLicencesAuthed(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })
  }

  const body = await request.json()
  const id = String(body.id ?? '')
  const statut = body.statut as ParrainageStatut | undefined

  if (!id || !statut) {
    return NextResponse.json({ error: 'id et statut requis' }, { status: 400 })
  }

  const allowed: ParrainageStatut[] = ['en_cours', 'abonnement_actif', 'commission_versee', 'annule']
  if (!allowed.includes(statut)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  const montant_abonnement = body.montant_abonnement != null
    ? Number(body.montant_abonnement)
    : null
  const commission_pct = body.commission_pct != null
    ? Number(body.commission_pct)
    : 10

  let commission_montant = body.commission_montant != null
    ? Number(body.commission_montant)
    : null

  if (statut === 'abonnement_actif' && montant_abonnement != null && commission_montant == null) {
    commission_montant = Math.round(montant_abonnement * commission_pct) / 100
  }

  const update: Record<string, unknown> = {
    statut,
    updated_at: new Date().toISOString(),
  }

  if (montant_abonnement != null) update.montant_abonnement = montant_abonnement
  if (commission_montant != null) update.commission_montant = commission_montant
  if (body.commission_pct != null) update.commission_pct = commission_pct
  if (body.filleul_ecole_slug != null) update.filleul_ecole_slug = String(body.filleul_ecole_slug).trim() || null
  if (body.filleul_ecole_nom != null) update.filleul_ecole_nom = String(body.filleul_ecole_nom).trim() || null

  const supabase = getSupabaseAdmin()!
  const { data, error } = await supabase
    .from('parrainages')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ parrainage: data })
}
