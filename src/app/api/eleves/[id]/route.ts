import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../lib/auth'
import { getEleveSituation } from '../../../../lib/paiements-utils'
import { getFraisExamenSituationForEleve } from '../../../../lib/frais-examens-utils'
import { requireModule } from '../../../../lib/rbac.server'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../../lib/school-api'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'eleves', 'GET')
  if (denied) return denied

  const { id } = await params
  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const eleve = db.prepare(`
    SELECT e.*, c.nom as classe_nom, c.section as classe_section
    FROM eleves e
    LEFT JOIN classes c ON c.id = e.classe_id
    WHERE e.id = ? AND e.ecole_id = ?
  `).get(id, ecoleId)

  if (!eleve) return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 })

  const parents   = db.prepare('SELECT * FROM parents WHERE eleve_id = ?').all(id)
  const paiements = db.prepare('SELECT * FROM paiements WHERE eleve_id = ? ORDER BY date_paiement DESC').all(id)
  const notes     = db.prepare(`
    SELECT n.*, m.nom as matiere_nom, m.coefficient, e.section
    FROM notes n
    LEFT JOIN matieres m ON m.id = n.matiere_id
    LEFT JOIN eleves e ON e.id = n.eleve_id
    WHERE n.eleve_id = ? ORDER BY n.periode, m.nom
  `).all(id)
  const presences = db.prepare(
    'SELECT * FROM presences WHERE eleve_id = ? ORDER BY date DESC LIMIT 60'
  ).all(id)

  const situation = getEleveSituation(db, ecoleId, id)
  const fraisExamen = getFraisExamenSituationForEleve(db, ecoleId, id)

  const classes = db.prepare(`
    SELECT id, nom, section, niveau FROM classes
    WHERE ecole_id = ? ORDER BY section, nom
  `).all(ecoleId)

  const ecole = db.prepare(`
    SELECT nom, adresse, telephone, email, directeur_nom, entete_url
    FROM ecoles WHERE id = ?
  `).get(ecoleId) as {
    nom: string; adresse: string; telephone: string; email: string
    directeur_nom: string; entete_url: string | null
  } | undefined

  const anneeRow = db.prepare(
    'SELECT label FROM annees_scolaires WHERE ecole_id = ? AND is_active = 1 LIMIT 1'
  ).get(ecoleId) as { label: string } | undefined

  return NextResponse.json({
    eleve, parents, paiements, notes, presences, situation, fraisExamen, classes,
    ecoleNom: ecole?.nom,
    ecole,
    anneeScolaire: anneeRow?.label ?? null,
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'eleves', 'PUT')
  if (denied) return denied

  const { id } = await params
  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  let section = body.section
  if (body.classe_id) {
    const classe = db.prepare(
      'SELECT section FROM classes WHERE id = ? AND ecole_id = ?'
    ).get(body.classe_id, ecoleId) as { section: string } | undefined
    if (classe) section = classe.section
  }

  db.prepare(`
    UPDATE eleves SET
      nom = ?, prenom = ?, date_naissance = ?,
      lieu_naissance = ?, sexe = ?, classe_id = ?,
      section = ?, statut = ?, statut_annuel = ?,
      photo_url = COALESCE(?, photo_url)
    WHERE id = ? AND ecole_id = ?
  `).run(
    body.nom, body.prenom, body.date_naissance,
    body.lieu_naissance, body.sexe, body.classe_id,
    section, body.statut, body.statut_annuel,
    body.photo_url ?? null,
    id, ecoleId
  )

  return jsonPersist(ecoleSlug, { success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'eleves', 'DELETE')
  if (denied) return denied

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const eleve = db.prepare(
    'SELECT id, nom, prenom FROM eleves WHERE id = ? AND ecole_id = ?'
  ).get(id, ecoleId) as { id: string; nom: string; prenom: string } | undefined

  if (!eleve) return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 })

  const paiements = db.prepare(
    'SELECT COUNT(*) as count FROM paiements WHERE eleve_id = ?'
  ).get(id) as { count: number }

  if (paiements.count > 0 && !force) {
    return NextResponse.json({
      warning: true,
      message: `Cet élève a ${paiements.count} paiement(s) enregistré(s). Confirmer la suppression ?`,
      nb_paiements: paiements.count
    }, { status: 409 })
  }

  db.prepare('DELETE FROM presences WHERE eleve_id = ?').run(id)
  db.prepare('DELETE FROM notes WHERE eleve_id = ?').run(id)
  db.prepare('DELETE FROM competences_maternelle WHERE eleve_id = ?').run(id)
  db.prepare('DELETE FROM paiements WHERE eleve_id = ?').run(id)
  db.prepare('DELETE FROM parents WHERE eleve_id = ?').run(id)
  db.prepare('DELETE FROM liste_attente WHERE eleve_id = ?').run(id)
  db.prepare('DELETE FROM academic_histories WHERE eleve_id = ?').run(id)
  db.prepare('DELETE FROM eleves WHERE id = ? AND ecole_id = ?').run(id, ecoleId)

  return jsonPersist(ecoleSlug, { success: true, message: `${eleve.prenom} ${eleve.nom} supprimé(e)` })
}
