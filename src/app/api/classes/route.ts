import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getActiveAnneeScolaire } from '../../../lib/db-server'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../lib/school-api'
import { requireModule } from '../../../lib/rbac.server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'classes', 'GET')
  if (denied) return denied

  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const classes = db.prepare(`
    SELECT c.*, COUNT(e.id) as nb_eleves,
      p.nom as enseignant_nom, p.prenom as enseignant_prenom, p.id as personnel_id
    FROM classes c
    LEFT JOIN eleves e ON e.classe_id = c.id AND e.statut = 'actif'
    LEFT JOIN personnel p ON p.id = c.personnel_id
    WHERE c.ecole_id = ?
    GROUP BY c.id
    ORDER BY c.section, c.niveau, c.nom
  `).all(ecoleId)

  return NextResponse.json({ classes })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'classes', 'POST')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const annee = body.annee_scolaire || getActiveAnneeScolaire(db, ecoleId)

  if (Array.isArray(body.classes)) {
    const insert = db.prepare(`
      INSERT INTO classes (ecole_id, nom, section, niveau, annee_scolaire, capacite_max)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    let created = 0
    for (const item of body.classes) {
      const exists = db.prepare(`
        SELECT id FROM classes WHERE ecole_id = ? AND nom = ? AND section = ? AND annee_scolaire = ?
      `).get(ecoleId, item.nom, item.section, annee)
      if (exists) continue
      insert.run(ecoleId, item.nom, item.section, item.niveau || item.code, annee, item.capacite_max || 60)
      created++
    }
    return jsonPersist(ecoleSlug, { success: true, created })
  }

  db.prepare(`
    INSERT INTO classes (ecole_id, nom, section, niveau, annee_scolaire, capacite_max)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(ecoleId, body.nom, body.section, body.niveau || null, annee, body.capacite_max || 60)

  return jsonPersist(ecoleSlug, { success: true })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'classes', 'PUT')
  if (denied) return denied

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const classe = db.prepare('SELECT id FROM classes WHERE id = ? AND ecole_id = ?').get(body.id, ecoleId)
  if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  if (body.personnel_id !== undefined) {
    if (body.personnel_id) {
      const pers = db.prepare(`
        SELECT id FROM personnel WHERE id = ? AND ecole_id = ? AND type = 'enseignant'
      `).get(body.personnel_id, ecoleId)
      if (!pers) return NextResponse.json({ error: 'Enseignant introuvable' }, { status: 400 })
    }
    db.prepare('UPDATE classes SET personnel_id = ? WHERE id = ?').run(body.personnel_id || null, body.id)
  }

  return jsonPersist(ecoleSlug, { success: true })
}
