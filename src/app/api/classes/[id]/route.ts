import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../lib/auth'
import { getDb, getActiveAnneeScolaire } from '../../../../lib/db-server'
import { getEleveSituation } from '../../../../lib/paiements-utils'
import { requireModule } from '../../../../lib/rbac.server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'classes', 'GET')
  if (denied) return denied

  const { id } = await params
  const db = getDb()
  const annee = getActiveAnneeScolaire(db, user.ecole_id)

  const classe = db.prepare(`
    SELECT c.*,
      p.id as enseignant_id, p.nom as enseignant_nom, p.prenom as enseignant_prenom,
      p.telephone as enseignant_telephone, p.email as enseignant_email,
      p.contrat as enseignant_contrat
    FROM classes c
    LEFT JOIN personnel p ON p.id = c.personnel_id
    WHERE c.id = ? AND c.ecole_id = ?
  `).get(id, user.ecole_id) as Record<string, unknown> | undefined

  if (!classe) {
    return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })
  }

  const eleves = db.prepare(`
    SELECT e.id, e.nom, e.prenom, e.numero_matricule, e.sexe, e.photo_url, e.statut,
      COALESCE((SELECT SUM(pa.montant) FROM paiements pa WHERE pa.eleve_id = e.id), 0) as total_paye,
      COALESCE((SELECT SUM(tc.montant_attendu) FROM tranches_config tc
        WHERE tc.classe_id = e.classe_id AND tc.annee_scolaire = ?), 0) as total_attendu
    FROM eleves e
    WHERE e.classe_id = ? AND e.ecole_id = ? AND e.statut = 'actif'
    ORDER BY e.nom, e.prenom
  `).all(annee, id, user.ecole_id) as Record<string, unknown>[]

  const matieres = db.prepare(`
    SELECT m.*
    FROM matieres m
    WHERE m.classe_id = ? AND m.ecole_id = ?
    ORDER BY m.nom
  `).all(id, user.ecole_id)

  const tranches = db.prepare(`
    SELECT * FROM tranches_config
    WHERE classe_id = ? AND ecole_id = ? AND annee_scolaire = ?
    ORDER BY tranche_numero
  `).all(id, user.ecole_id, annee)

  const enseignants = db.prepare(`
    SELECT id, nom, prenom, telephone, email
    FROM personnel
    WHERE ecole_id = ? AND type = 'enseignant'
    ORDER BY nom
  `).all(user.ecole_id)

  const nbEleves = eleves.length
  const capacite = (classe.capacite_max as number) || 60

  const ecoleId = user.ecole_id

  const elevesAvecSituation = eleves.map(el => {
    const situation = getEleveSituation(db, ecoleId, el.id as string)
    return {
      ...el,
      paiement_statut: situation?.statut ?? 'non_configure',
      total_reste: situation?.total_reste ?? 0,
    }
  })

  const impayes = elevesAvecSituation.filter(
    e => e.paiement_statut === 'impaye' || e.paiement_statut === 'partiel',
  ).length

  return NextResponse.json({
    classe: {
      ...classe,
      nb_eleves: nbEleves,
      taux_remplissage: capacite > 0 ? Math.round((nbEleves / capacite) * 100) : 0,
    },
    eleves: elevesAvecSituation,
    matieres,
    tranches,
    enseignants,
    annee_scolaire: annee,
    stats: {
      nb_eleves: nbEleves,
      capacite_max: capacite,
      impayes,
      nb_matieres: matieres.length,
    },
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'classes', 'PUT')
  if (denied) return denied

  const { id } = await params
  const body = await request.json()
  const db = getDb()

  const classe = db.prepare('SELECT id FROM classes WHERE id = ? AND ecole_id = ?').get(id, user.ecole_id)
  if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  if (body.personnel_id !== undefined) {
    if (body.personnel_id) {
      const pers = db.prepare(`
        SELECT id FROM personnel WHERE id = ? AND ecole_id = ? AND type = 'enseignant'
      `).get(body.personnel_id, user.ecole_id)
      if (!pers) return NextResponse.json({ error: 'Enseignant introuvable' }, { status: 400 })
    }
    db.prepare('UPDATE classes SET personnel_id = ? WHERE id = ?').run(body.personnel_id || null, id)
  }

  if (body.capacite_max !== undefined) {
    db.prepare('UPDATE classes SET capacite_max = ? WHERE id = ?').run(body.capacite_max, id)
  }

  return NextResponse.json({ success: true })
}
