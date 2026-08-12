import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { requireModule } from '../../../lib/rbac.server'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../lib/school-api'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'presences', 'GET')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const classe_id = searchParams.get('classe_id')
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const eleves = db.prepare(`
    SELECT e.id, e.nom, e.prenom, e.numero_matricule,
      p.statut, p.note as obs
    FROM eleves e
    LEFT JOIN presences p ON p.eleve_id = e.id AND p.date = ?
    WHERE e.ecole_id = ? AND e.statut = 'actif'
    ${classe_id ? 'AND e.classe_id = ?' : ''}
    ORDER BY e.nom
  `).all(...[date, ecoleId, ...(classe_id ? [classe_id] : [])])

  return NextResponse.json({ eleves, date })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'presences', 'POST')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const checkStmt = db.prepare(`
    SELECT id FROM presences WHERE ecole_id = ? AND eleve_id = ? AND date = ?
  `)
  const insertStmt = db.prepare(`
    INSERT INTO presences (ecole_id, eleve_id, date, statut, note)
    VALUES (?, ?, ?, ?, ?)
  `)
  const updateStmt = db.prepare(`
    UPDATE presences SET statut = ?, note = ?
    WHERE ecole_id = ? AND eleve_id = ? AND date = ?
  `)

  const saveAll = db.transaction((presences: { eleve_id: string; statut: string; note?: string }[]) => {
    for (const p of presences) {
      const existing = checkStmt.get(ecoleId, p.eleve_id, body.date)
      if (existing) {
        updateStmt.run(p.statut, p.note || null, ecoleId, p.eleve_id, body.date)
      } else {
        insertStmt.run(ecoleId, p.eleve_id, body.date, p.statut, p.note || null)
      }
    }
  })

  saveAll(body.presences)
  return jsonPersist(ecoleSlug, { success: true })
}
