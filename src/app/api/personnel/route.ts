import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../lib/school-api'
import { requireModule } from '../../../lib/rbac.server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'personnel', 'GET')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const search = searchParams.get('search')
  const contrat = searchParams.get('contrat')

  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  let query = `SELECT * FROM personnel WHERE ecole_id = ?`
  const params: unknown[] = [ecoleId]
  if (type) { query += ' AND type = ?'; params.push(type) }
  if (contrat) { query += ' AND contrat = ?'; params.push(contrat) }
  if (search) {
    query += ' AND (nom LIKE ? OR prenom LIKE ? OR telephone LIKE ? OR email LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  query += ' ORDER BY nom'

  return NextResponse.json({ personnel: db.prepare(query).all(...params) })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'personnel', 'POST')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  db.prepare(`
    INSERT INTO personnel (ecole_id, nom, prenom, telephone, email, type, contrat, date_embauche, salaire)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ecoleId, body.nom, body.prenom || null,
    body.telephone || null, body.email || null,
    body.type, body.contrat || null,
    body.date_embauche || null, body.salaire || null
  )

  return jsonPersist(ecoleSlug, { success: true })
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'personnel', 'DELETE')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  db.prepare('DELETE FROM personnel WHERE id = ? AND ecole_id = ?').run(id, ecoleId)
  return jsonPersist(ecoleSlug, { success: true })
}
