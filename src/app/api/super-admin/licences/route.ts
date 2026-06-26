import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db-server'
import { generatePoolLicenceKey, generateLicenceKey, PLAN_PRICES } from '../../../../lib/licence'

export async function GET(request: NextRequest) {
  if (!await requireSuperAdmin(request)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const db = getDb()
  const licences = db.prepare(`
    SELECT l.*, e.nom as ecole_nom, e.slug as ecole_slug
    FROM licences l
    LEFT JOIN ecoles e ON e.id = l.ecole_id
    ORDER BY l.created_at DESC
  `).all()

  const stats = {
    pool: (licences as { ecole_id: string | null; is_active: number }[]).filter(l => !l.ecole_id && l.is_active).length,
    actives: (licences as { is_active: number; date_fin: string }[]).filter(
      l => l.is_active && l.date_fin >= new Date().toISOString().split('T')[0]
    ).length,
  }

  return NextResponse.json({ licences, stats, plans: PLAN_PRICES })
}

export async function POST(request: NextRequest) {
  if (!await requireSuperAdmin(request)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json()
  const db = getDb()
  const mode = body.mode || 'activation'

  if (mode === 'activation') {
    const cle = generatePoolLicenceKey(body.type, body.date_debut, body.date_fin)

    db.prepare(`
      INSERT INTO licences (ecole_id, type, date_debut, date_fin, is_active, cle_licence)
      VALUES (NULL, ?, ?, ?, 1, ?)
    `).run(body.type, body.date_debut, body.date_fin, cle)

    return NextResponse.json({ success: true, cle_licence: cle, mode: 'activation' })
  }

  if (mode === 'renewal') {
    if (!body.ecole_id) {
      return NextResponse.json({ error: 'École requise pour un renouvellement' }, { status: 400 })
    }

    const ecole = db.prepare('SELECT * FROM ecoles WHERE id = ?').get(body.ecole_id) as { slug: string } | undefined
    if (!ecole) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

    const existing = db.prepare(`
      SELECT id FROM licences WHERE ecole_id = ? AND is_active = 1
      ORDER BY date_fin DESC LIMIT 1
    `).get(body.ecole_id) as { id: string } | undefined

    if (existing) {
      db.prepare(`
        UPDATE licences SET date_fin = ?, type = ?, is_active = 1 WHERE id = ?
      `).run(body.date_fin, body.type, existing.id)

      return NextResponse.json({ success: true, mode: 'renewal', extended: true })
    }

    const cle = generateLicenceKey(ecole.slug, body.type, body.date_debut)
    db.prepare(`
      INSERT INTO licences (ecole_id, type, date_debut, date_fin, is_active, cle_licence)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(body.ecole_id, body.type, body.date_debut, body.date_fin, cle)

    return NextResponse.json({ success: true, cle_licence: cle, mode: 'renewal' })
  }

  return NextResponse.json({ error: 'Mode inconnu' }, { status: 400 })
}

export async function PUT(request: NextRequest) {
  if (!await requireSuperAdmin(request)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json()
  const db = getDb()

  db.prepare(`
    UPDATE licences SET is_active = ?, date_fin = ?
    WHERE id = ?
  `).run(body.is_active ? 1 : 0, body.date_fin, body.id)

  return NextResponse.json({ success: true })
}
