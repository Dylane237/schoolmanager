import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../lib/auth'
import { getActiveAnneeScolaire } from '../../../../lib/db-server'
import { getEleveSituation, sqlTotalAttenduEleve } from '../../../../lib/paiements-utils'
import { getFraisExamenResumeForClasse } from '../../../../lib/frais-examens-utils'
import { requireModule } from '../../../../lib/rbac.server'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../../lib/school-api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'classes', 'GET')
  if (denied) return denied

  const { id } = await params
  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const annee = getActiveAnneeScolaire(db, ecoleId)

  const classe = db.prepare(`
    SELECT c.*,
      p.id as enseignant_id, p.nom as enseignant_nom, p.prenom as enseignant_prenom,
      p.telephone as enseignant_telephone, p.email as enseignant_email,
      p.contrat as enseignant_contrat
    FROM classes c
    LEFT JOIN personnel p ON p.id = c.personnel_id
    WHERE c.id = ? AND c.ecole_id = ?
  `).get(id, ecoleId) as Record<string, unknown> | undefined

  if (!classe) {
    return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })
  }

  const totalAttenduSql = sqlTotalAttenduEleve('?')

  const eleves = db.prepare(`
    SELECT e.id, e.nom, e.prenom, e.numero_matricule, e.sexe, e.photo_url, e.statut,
      COALESCE((SELECT SUM(pa.montant) FROM paiements pa WHERE pa.eleve_id = e.id), 0) as total_paye,
      ${totalAttenduSql} as total_attendu
    FROM eleves e
    WHERE e.classe_id = ? AND e.ecole_id = ? AND e.statut = 'actif'
    ORDER BY e.nom, e.prenom
  `).all(annee, annee, id, ecoleId) as Record<string, unknown>[]

  const matieres = db.prepare(`
    SELECT m.*
    FROM matieres m
    WHERE m.classe_id = ? AND m.ecole_id = ?
    ORDER BY m.nom
  `).all(id, ecoleId)

  const tranches = db.prepare(`
    SELECT * FROM tranches_config
    WHERE classe_id = ? AND ecole_id = ? AND annee_scolaire = ?
    ORDER BY tranche_numero
  `).all(id, ecoleId, annee)

  const enseignants = db.prepare(`
    SELECT id, nom, prenom, telephone, email
    FROM personnel
    WHERE ecole_id = ? AND type = 'enseignant'
    ORDER BY nom
  `).all(ecoleId)

  const nbEleves = eleves.length
  const capacite = (classe.capacite_max as number) || 60

  const fraisExamenData = getFraisExamenResumeForClasse(db, ecoleId, id, annee)
  const fraisByEleve = new Map(fraisExamenData.eleves.map(e => [e.eleve_id, e]))

  const elevesAvecSituation = eleves.map(el => {
    const situation = getEleveSituation(db, ecoleId, el.id as string)
    const frais = fraisByEleve.get(el.id as string)
    return {
      ...el,
      paiement_statut: situation?.statut ?? 'non_configure',
      total_reste: situation?.total_reste ?? 0,
      frais_examen_statut: fraisExamenData.config ? (frais?.statut ?? 'non_configure') : null,
      frais_examen_reste: frais?.reste ?? 0,
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
    frais_examen: fraisExamenData.config,
    frais_examen_impayes: fraisExamenData.impayes,
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
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'classes', 'PUT')
  if (denied) return denied

  const { id } = await params
  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const classe = db.prepare('SELECT id FROM classes WHERE id = ? AND ecole_id = ?').get(id, ecoleId)
  if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  if (body.personnel_id !== undefined) {
    if (body.personnel_id) {
      const pers = db.prepare(`
        SELECT id FROM personnel WHERE id = ? AND ecole_id = ? AND type = 'enseignant'
      `).get(body.personnel_id, ecoleId)
      if (!pers) return NextResponse.json({ error: 'Enseignant introuvable' }, { status: 400 })
    }
    db.prepare('UPDATE classes SET personnel_id = ? WHERE id = ?').run(body.personnel_id || null, id)
  }

  if (body.capacite_max !== undefined) {
    db.prepare('UPDATE classes SET capacite_max = ? WHERE id = ?').run(body.capacite_max, id)
  }

  return jsonPersist(ecoleSlug, { success: true })
}
