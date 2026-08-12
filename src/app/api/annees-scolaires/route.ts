import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { requireModule } from '../../../lib/rbac.server'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../lib/school-api'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const annees = db.prepare(`
    SELECT * FROM annees_scolaires
    WHERE ecole_id = ?
    ORDER BY is_active DESC, label DESC
  `).all(ecoleId)

  return NextResponse.json({ annees })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const denied = requireModule(user, 'parametres', 'POST')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  if (!body.label || !/^\d{4}-\d{4}$/.test(body.label)) {
    return NextResponse.json(
      { error: 'Format requis : AAAA-AAAA (ex: 2026-2027)' },
      { status: 400 }
    )
  }

  db.prepare(`
    INSERT INTO annees_scolaires (ecole_id, label, date_debut, date_fin, is_active)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    ecoleId,
    body.label,
    body.date_debut || `${body.label.split('-')[0]}-09-01`,
    body.date_fin || `${body.label.split('-')[1]}-07-31`,
    body.is_active ? 1 : 0
  )

  if (body.is_active) {
    db.prepare(`
      UPDATE annees_scolaires SET is_active = 0
      WHERE ecole_id = ? AND label != ?
    `).run(ecoleId, body.label)
  }

  return jsonPersist(ecoleSlug, { success: true })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const denied = requireModule(user, 'parametres', 'PUT')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  if (body.is_active) {
    db.prepare(`
      UPDATE annees_scolaires SET is_active = 0 WHERE ecole_id = ?
    `).run(ecoleId)
  }

  db.prepare(`
    UPDATE annees_scolaires SET is_active = ? WHERE id = ? AND ecole_id = ?
  `).run(body.is_active ? 1 : 0, body.id, ecoleId)

  return jsonPersist(ecoleSlug, { success: true })
}
