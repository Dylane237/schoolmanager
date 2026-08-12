import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { requireModule } from '../../../lib/rbac.server'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../lib/school-api'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'annonces', 'GET')
  if (denied) return denied

  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const annonces = db.prepare(`
    SELECT a.*, u.nom as auteur_nom
    FROM annonces a
    LEFT JOIN users u ON u.id = a.auteur_id
    WHERE a.ecole_id = ?
    ORDER BY a.date_publication DESC
  `).all(ecoleId)

  return NextResponse.json({ annonces })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'annonces', 'POST')
  if (denied) return denied

  const body = await request.json()
  if (!body.titre?.trim() || !body.contenu?.trim()) {
    return NextResponse.json({ error: 'Titre et contenu requis' }, { status: 400 })
  }

  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  db.prepare(`
    INSERT INTO annonces (ecole_id, titre, contenu, cible, priorite, auteur_id, date_expiration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    ecoleId,
    body.titre.trim(),
    body.contenu.trim(),
    body.cible || 'tous',
    body.priorite || 'normale',
    user.id,
    body.date_expiration || null
  )

  return jsonPersist(ecoleSlug, { success: true })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'annonces', 'PUT')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  db.prepare(`
    UPDATE annonces SET is_active = ? WHERE id = ? AND ecole_id = ?
  `).run(body.is_active ? 1 : 0, body.id, ecoleId)

  return jsonPersist(ecoleSlug, { success: true })
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'annonces', 'DELETE')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  db.prepare('DELETE FROM annonces WHERE id = ? AND ecole_id = ?').run(id, ecoleId)

  return jsonPersist(ecoleSlug, { success: true })
}
