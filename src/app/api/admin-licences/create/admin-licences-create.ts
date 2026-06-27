import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac, randomBytes } from 'crypto'

function isAuthed(request: NextRequest) {
  const token = request.cookies.get('admin_licences_token')?.value
  return token === process.env.SUPER_ADMIN_PASSWORD
}

function generateKey(plan: string, dateDebut: string, dateFin: string): string {
  const year = new Date(dateDebut).getFullYear()
  const nonce = randomBytes(8).toString('hex')
  const hash = createHmac('sha256', process.env.SM_JWT_SECRET || 'secret')
    .update(`pool|${nonce}|${plan.toLowerCase()}|${dateDebut}|${dateFin}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase()
  return `${plan.toUpperCase()}-POOL-${year}-${hash}`
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { plan, date_fin } = await request.json()
  if (!plan || !date_fin) {
    return NextResponse.json({ error: 'Plan et date_fin requis' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const date_debut = new Date().toISOString().split('T')[0]
  const cle = generateKey(plan, date_debut, date_fin)

  const { error } = await supabase.from('licences').insert({
    type: plan,
    date_debut,
    date_fin,
    is_active: 1,
    cle_licence: cle,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cle })
}
