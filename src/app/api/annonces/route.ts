import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb } from '../../../lib/db-server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const db = getDb()
  const annonces = db.prepare(`
    SELECT a.*, u.nom as auteur_nom
    FROM annonces a
    LEFT JOIN users u ON u.id = a.auteur_id
    WHERE a.ecole_id = ?
    ORDER BY a.date_publication DESC
  `).all(user.ecole_id)

  return NextResponse.json({ annonces })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  if (!body.titre?.trim() || !body.contenu?.trim()) {
    return NextResponse.json({ error: 'Titre et contenu requis' }, { status: 400 })
  }

  const db = getDb()
  db.prepare(`
    INSERT INTO annonces (ecole_id, titre, contenu, cible, priorite, auteur_id, date_expiration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.ecole_id,
    body.titre.trim(),
    body.contenu.trim(),
    body.cible || 'tous',
    body.priorite || 'normale',
    user.id,
    body.date_expiration || null
  )

  return NextResponse.json({ success: true })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const db = getDb()

  db.prepare(`
    UPDATE annonces SET is_active = ? WHERE id = ? AND ecole_id = ?
  `).run(body.is_active ? 1 : 0, body.id, user.ecole_id)

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const db = getDb()
  db.prepare('DELETE FROM annonces WHERE id = ? AND ecole_id = ?').run(id, user.ecole_id)

  return NextResponse.json({ success: true })
}
