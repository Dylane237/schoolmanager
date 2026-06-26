import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb } from '../../../lib/db-server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const classe_id = searchParams.get('classe_id')
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const db = getDb()

  const eleves = db.prepare(`
    SELECT e.id, e.nom, e.prenom, e.numero_matricule,
      p.statut, p.note as obs
    FROM eleves e
    LEFT JOIN presences p ON p.eleve_id = e.id AND p.date = ?
    WHERE e.ecole_id = ? AND e.statut = 'actif'
    ${classe_id ? 'AND e.classe_id = ?' : ''}
    ORDER BY e.nom
  `).all(...[date, user.ecole_id, ...(classe_id ? [classe_id] : [])])

  return NextResponse.json({ eleves, date })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const db = getDb()

  // body.presences = [{ eleve_id, statut, note }]
  const upsert = db.prepare(`
    INSERT INTO presences (ecole_id, eleve_id, date, statut, note)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(ecole_id, eleve_id, date) DO UPDATE SET
      statut = excluded.statut,
      note = excluded.note
  `)

  // SQLite ne supporte pas ON CONFLICT sans index unique — on fait upsert manuel
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

  const saveAll = db.transaction((presences: any[]) => {
    for (const p of presences) {
      const existing = checkStmt.get(user.ecole_id, p.eleve_id, body.date)
      if (existing) {
        updateStmt.run(p.statut, p.note || null, user.ecole_id, p.eleve_id, body.date)
      } else {
        insertStmt.run(user.ecole_id, p.eleve_id, body.date, p.statut, p.note || null)
      }
    }
  })

  saveAll(body.presences)
  return NextResponse.json({ success: true })
}