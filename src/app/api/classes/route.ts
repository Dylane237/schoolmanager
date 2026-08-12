import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb, getActiveAnneeScolaire } from '../../../lib/db-server'
import { requireModule } from '../../../lib/rbac.server'
import { isCloudReadMode, fetchCloudClasses } from '../../../lib/cloud-read'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id && !user?.ecole_slug) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'classes', 'GET')
  if (denied) return denied

  if (isCloudReadMode() && user.ecole_slug) {
    const classes = await fetchCloudClasses(user.ecole_slug)
    return NextResponse.json({ classes, source: 'cloud' })
  }

  if (!user.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const db = getDb()
  const classes = db.prepare(`
    SELECT c.*, COUNT(e.id) as nb_eleves,
      p.nom as enseignant_nom, p.prenom as enseignant_prenom, p.id as personnel_id
    FROM classes c
    LEFT JOIN eleves e ON e.classe_id = c.id AND e.statut = 'actif'
    LEFT JOIN personnel p ON p.id = c.personnel_id
    WHERE c.ecole_id = ?
    GROUP BY c.id
    ORDER BY c.section, c.niveau, c.nom
  `).all(user.ecole_id)

  return NextResponse.json({ classes })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'classes', 'POST')
  if (denied) return denied

  const body = await request.json()
  const db = getDb()
  const annee = body.annee_scolaire || getActiveAnneeScolaire(db, user.ecole_id)

  if (Array.isArray(body.classes)) {
    const insert = db.prepare(`
      INSERT INTO classes (ecole_id, nom, section, niveau, annee_scolaire, capacite_max)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    let created = 0
    for (const item of body.classes) {
      const exists = db.prepare(`
        SELECT id FROM classes WHERE ecole_id = ? AND nom = ? AND section = ? AND annee_scolaire = ?
      `).get(user.ecole_id, item.nom, item.section, annee)
      if (exists) continue
      insert.run(user.ecole_id, item.nom, item.section, item.niveau || item.code, annee, item.capacite_max || 60)
      created++
    }
    return NextResponse.json({ success: true, created })
  }

  db.prepare(`
    INSERT INTO classes (ecole_id, nom, section, niveau, annee_scolaire, capacite_max)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.ecole_id, body.nom, body.section, body.niveau || null, annee, body.capacite_max || 60)

  return NextResponse.json({ success: true })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'classes', 'PUT')
  if (denied) return denied

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const db = getDb()
  const classe = db.prepare('SELECT id FROM classes WHERE id = ? AND ecole_id = ?').get(body.id, user.ecole_id)
  if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  if (body.personnel_id !== undefined) {
    if (body.personnel_id) {
      const pers = db.prepare(`
        SELECT id FROM personnel WHERE id = ? AND ecole_id = ? AND type = 'enseignant'
      `).get(body.personnel_id, user.ecole_id)
      if (!pers) return NextResponse.json({ error: 'Enseignant introuvable' }, { status: 400 })
    }
    db.prepare('UPDATE classes SET personnel_id = ? WHERE id = ?').run(body.personnel_id || null, body.id)
  }

  return NextResponse.json({ success: true })
}
