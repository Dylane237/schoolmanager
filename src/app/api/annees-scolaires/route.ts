import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb } from '../../../lib/db-server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const db = getDb()
  const annees = db.prepare(`
    SELECT * FROM annees_scolaires
    WHERE ecole_id = ?
    ORDER BY is_active DESC, label DESC
  `).all(user.ecole_id)

  return NextResponse.json({ annees })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const db = getDb()

  if (!body.label || !/^\d{4}-\d{4}$/.test(body.label)) {
    return NextResponse.json(
      { error: 'Format requis : AAAA-AAAA (ex: 2025-2026)' },
      { status: 400 }
    )
  }

  db.prepare(`
    INSERT INTO annees_scolaires (ecole_id, label, date_debut, date_fin, is_active)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    user.ecole_id,
    body.label,
    body.date_debut || `${body.label.split('-')[0]}-09-01`,
    body.date_fin || `${body.label.split('-')[1]}-07-31`,
    body.is_active ? 1 : 0
  )

  if (body.is_active) {
    db.prepare(`
      UPDATE annees_scolaires SET is_active = 0
      WHERE ecole_id = ? AND label != ?
    `).run(user.ecole_id, body.label)
  }

  return NextResponse.json({ success: true })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const db = getDb()

  if (body.is_active) {
    db.prepare(`
      UPDATE annees_scolaires SET is_active = 0 WHERE ecole_id = ?
    `).run(user.ecole_id)
  }

  db.prepare(`
    UPDATE annees_scolaires SET is_active = ? WHERE id = ? AND ecole_id = ?
  `).run(body.is_active ? 1 : 0, body.id, user.ecole_id)

  return NextResponse.json({ success: true })
}
