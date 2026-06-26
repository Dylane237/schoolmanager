import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../../lib/db-server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cle = searchParams.get('cle')?.trim().toUpperCase()

  if (!cle) {
    return NextResponse.json({ valid: false, error: 'Clé requise' }, { status: 400 })
  }

  const db = getDb()
  const licence = db.prepare(`
    SELECT id, type, date_debut, date_fin, ecole_id, is_active
    FROM licences WHERE cle_licence = ?
  `).get(cle) as {
    id: string
    type: string
    date_debut: string
    date_fin: string
    ecole_id: string | null
    is_active: number
  } | undefined

  if (!licence) {
    return NextResponse.json({ valid: false, error: 'Clé introuvable' })
  }

  if (!licence.is_active) {
    return NextResponse.json({ valid: false, error: 'Cette clé a été révoquée' })
  }

  if (licence.ecole_id) {
    return NextResponse.json({ valid: false, error: 'Cette clé est déjà utilisée par une école' })
  }

  const today = new Date().toISOString().split('T')[0]
  if (licence.date_fin < today) {
    return NextResponse.json({ valid: false, error: 'Cette clé a expiré' })
  }

  return NextResponse.json({
    valid: true,
    plan: licence.type,
    date_fin: licence.date_fin,
    message: `Licence ${licence.type} valide jusqu'au ${licence.date_fin}`,
  })
}
