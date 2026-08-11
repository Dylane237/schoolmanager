import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const SERVER_SECRET = process.env.LICENCE_SERVER_SECRET
  if (!SERVER_SECRET) {
    return NextResponse.json({ error: 'Service non configuré' }, { status: 503 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 503 })
  }

  const secret = request.headers.get('x-server-secret')
  if (secret !== SERVER_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const body = await request.json()
  const { cle, plan, date_debut, date_fin, ecole_slug, ecole_nom } = body

  if (!cle || !plan || !date_fin) {
    return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 })
  }

  const { error } = await supabase
    .from('licences_central')
    .upsert({
      cle,
      plan,
      date_debut,
      date_fin,
      ecole_slug,
      ecole_nom,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'cle' })

  if (error) {
    console.error('[sync] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, cle })
}
