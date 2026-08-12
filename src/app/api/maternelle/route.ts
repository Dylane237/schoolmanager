import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { requireModule } from '../../../lib/rbac.server'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../lib/school-api'

const DOMAINES_DEFAUT = [
  {
    nom: 'Langage et communication',
    competences: [
      'S\'exprime clairement à l\'oral',
      'Comprend et exécute des consignes simples',
      'Reconnaît et nomme les lettres de l\'alphabet',
      'Raconte une histoire avec ses mots',
      'Participe aux échanges collectifs',
    ]
  },
  {
    nom: 'Mathématiques et logique',
    competences: [
      'Compte jusqu\'à 20',
      'Reconnaît les chiffres de 0 à 9',
      'Compare des quantités (plus, moins, autant)',
      'Classe et trie des objets selon un critère',
      'Reconnaît les formes géométriques de base',
    ]
  },
  {
    nom: 'Découverte du monde',
    competences: [
      'Situe les événements dans le temps (avant, après, hier, demain)',
      'Connaît les parties du corps humain',
      'Distingue le vivant du non-vivant',
      'Identifie les saisons et phénomènes naturels',
      'S\'oriente dans l\'espace (dessus, dessous, devant, derrière)',
    ]
  },
  {
    nom: 'Arts plastiques et créativité',
    competences: [
      'Tient correctement un crayon',
      'Dessine librement avec intention',
      'Utilise différentes techniques plastiques (coloriage, collage, modelage)',
      'Reconnaît et nomme les couleurs primaires',
      'Reproduit un modèle simple',
    ]
  },
  {
    nom: 'Éducation physique',
    competences: [
      'Court, saute, grimpe avec aisance',
      'Lance et attrape un ballon',
      'Se repère dans l\'espace (droite, gauche)',
      'Respecte les règles d\'un jeu collectif',
      'Maîtrise son équilibre',
    ]
  },
  {
    nom: 'Développement personnel et social',
    competences: [
      'Respecte les règles de vie de la classe',
      'Coopère avec ses camarades',
      'Gère ses émotions de façon appropriée',
      'Est autonome dans les gestes du quotidien',
      'Prend soin du matériel et de l\'environnement',
    ]
  },
]

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'maternelle', 'GET')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const eleve_id = searchParams.get('eleve_id')
  const periode = searchParams.get('periode') || 'sequence1'
  const classe_id = searchParams.get('classe_id')

  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  let eleves: Record<string, unknown>[] = []
  if (classe_id) {
    eleves = db.prepare(`
      SELECT e.id, e.nom, e.prenom, e.numero_matricule, c.nom as classe_nom
      FROM eleves e
      LEFT JOIN classes c ON c.id = e.classe_id
      WHERE e.ecole_id = ? AND e.classe_id = ? AND e.statut = 'actif'
      ORDER BY e.nom
    `).all(ecoleId, classe_id) as Record<string, unknown>[]
  } else {
    eleves = db.prepare(`
      SELECT e.id, e.nom, e.prenom, e.numero_matricule, c.nom as classe_nom
      FROM eleves e
      LEFT JOIN classes c ON c.id = e.classe_id
      WHERE e.ecole_id = ? AND c.section = 'maternelle' AND e.statut = 'actif'
      ORDER BY c.nom, e.nom
    `).all(ecoleId) as Record<string, unknown>[]
  }

  const classes = db.prepare(`
    SELECT id, nom FROM classes
    WHERE ecole_id = ? AND section = 'maternelle'
    ORDER BY nom
  `).all(ecoleId)

  const config = db.prepare(
    'SELECT valeur FROM parametres_maternelle WHERE ecole_id = ?'
  ).get(ecoleId) as { valeur: string } | undefined

  const domaines = config ? JSON.parse(config.valeur) : DOMAINES_DEFAUT

  let competences: unknown[] = []
  if (eleve_id) {
    competences = db.prepare(`
      SELECT * FROM competences_maternelle
      WHERE ecole_id = ? AND eleve_id = ? AND periode = ?
    `).all(ecoleId, eleve_id, periode)
  } else {
    competences = db.prepare(`
      SELECT * FROM competences_maternelle
      WHERE ecole_id = ? AND periode = ?
    `).all(ecoleId, periode)
  }

  return NextResponse.json({ eleves, classes, domaines, competences })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'maternelle', 'POST')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const existing = db.prepare(`
    SELECT id FROM competences_maternelle
    WHERE ecole_id = ? AND eleve_id = ? AND periode = ? AND domaine = ? AND competence = ?
  `).get(ecoleId, body.eleve_id, body.periode, body.domaine, body.competence) as { id: string } | undefined

  if (existing) {
    db.prepare(`
      UPDATE competences_maternelle
      SET statut = ?, observation = ?, saisie_par = ?
      WHERE id = ?
    `).run(body.statut, body.observation || null, user.id, existing.id)
  } else {
    db.prepare(`
      INSERT INTO competences_maternelle
        (ecole_id, eleve_id, periode, domaine, competence, statut, observation, saisie_par)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ecoleId, body.eleve_id, body.periode,
      body.domaine, body.competence, body.statut,
      body.observation || null, user.id
    )
  }

  return jsonPersist(ecoleSlug, { success: true })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'maternelle', 'PUT')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  db.prepare(`
    INSERT INTO parametres_maternelle (ecole_id, valeur)
    VALUES (?, ?)
    ON CONFLICT(ecole_id) DO UPDATE SET valeur = excluded.valeur
  `).run(ecoleId, JSON.stringify(body.domaines))

  return jsonPersist(ecoleSlug, { success: true })
}
