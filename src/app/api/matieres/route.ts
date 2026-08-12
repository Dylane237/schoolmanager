import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { requireModule } from '../../../lib/rbac.server'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../lib/school-api'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'classes', 'GET')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const classe_id = searchParams.get('classe_id')

  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const matieres = db.prepare(`
    SELECT * FROM matieres WHERE ecole_id = ?
    ${classe_id ? 'AND classe_id = ?' : ''}
    ORDER BY nom
  `).all(...[ecoleId, ...(classe_id ? [classe_id] : [])])

  return NextResponse.json({ matieres })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'classes', 'POST')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  db.prepare(`
    INSERT INTO matieres (ecole_id, classe_id, nom, nom_en, coefficient, section)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(ecoleId, body.classe_id, body.nom,
     body.nom_en || null, body.coefficient || 1, body.section || null)

  return jsonPersist(ecoleSlug, { success: true })
}
