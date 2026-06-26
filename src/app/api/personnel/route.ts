import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb } from '../../../lib/db-server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  const db = getDb()
  const personnel = db.prepare(`
    SELECT * FROM personnel
    WHERE ecole_id = ?
    ${type ? 'AND type = ?' : ''}
    ORDER BY nom
  `).all(...[user.ecole_id, ...(type ? [type] : [])])

  return NextResponse.json({ personnel })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const db = getDb()

  db.prepare(`
    INSERT INTO personnel (ecole_id, nom, prenom, telephone, email, type, contrat, date_embauche, salaire)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.ecole_id, body.nom, body.prenom || null,
    body.telephone || null, body.email || null,
    body.type, body.contrat || null,
    body.date_embauche || null, body.salaire || null
  )

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const db = getDb()
  db.prepare('DELETE FROM personnel WHERE id = ? AND ecole_id = ?').run(id, user.ecole_id)

  return NextResponse.json({ success: true })
}