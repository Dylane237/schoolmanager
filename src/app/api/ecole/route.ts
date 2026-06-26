import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb } from '../../../lib/db-server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const db = getDb()
  const ecole = db.prepare('SELECT * FROM ecoles WHERE id = ?').get(user.ecole_id)

  return NextResponse.json({ ecole })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const db = getDb()

  db.prepare(`
    UPDATE ecoles SET
      nom = ?, telephone = ?, adresse = ?,
      email = ?, directeur_nom = ?
    WHERE id = ?
  `).run(body.nom, body.telephone, body.adresse, body.email, body.directeur_nom, user.ecole_id)

  return NextResponse.json({ success: true })
}