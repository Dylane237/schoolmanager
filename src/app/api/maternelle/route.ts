import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb } from '../../../lib/db-server'

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
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const eleve_id = searchParams.get('eleve_id')
  const periode = searchParams.get('periode') || 'sequence1'
  const classe_id = searchParams.get('classe_id')

  const db = getDb()

  // Élèves maternelle de l'école
  let eleves: any[] = []
  if (classe_id) {
    eleves = db.prepare(`
      SELECT e.id, e.nom, e.prenom, e.numero_matricule, c.nom as classe_nom
      FROM eleves e
      LEFT JOIN classes c ON c.id = e.classe_id
      WHERE e.ecole_id = ? AND e.classe_id = ? AND e.statut = 'actif'
      ORDER BY e.nom
    `).all(user.ecole_id, classe_id)
  } else {
    eleves = db.prepare(`
      SELECT e.id, e.nom, e.prenom, e.numero_matricule, c.nom as classe_nom
      FROM eleves e
      LEFT JOIN classes c ON c.id = e.classe_id
      WHERE e.ecole_id = ? AND c.section = 'maternelle' AND e.statut = 'actif'
      ORDER BY c.nom, e.nom
    `).all(user.ecole_id)
  }

  // Classes maternelle
  const classes = db.prepare(`
    SELECT id, nom FROM classes
    WHERE ecole_id = ? AND section = 'maternelle'
    ORDER BY nom
  `).all(user.ecole_id)

  // Domaines personnalisés (stockés en JSON dans parametres_maternelle)
  const config = db.prepare(
    'SELECT valeur FROM parametres_maternelle WHERE ecole_id = ?'
  ).get(user.ecole_id) as any

  const domaines = config ? JSON.parse(config.valeur) : DOMAINES_DEFAUT

  // Compétences saisies pour la période
  let competences: any[] = []
  if (eleve_id) {
    competences = db.prepare(`
      SELECT * FROM competences_maternelle
      WHERE ecole_id = ? AND eleve_id = ? AND periode = ?
    `).all(user.ecole_id, eleve_id, periode)
  } else {
    competences = db.prepare(`
      SELECT * FROM competences_maternelle
      WHERE ecole_id = ? AND periode = ?
    `).all(user.ecole_id, periode)
  }

  return NextResponse.json({ eleves, classes, domaines, competences })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const db = getDb()

  // Upsert compétence
  const existing = db.prepare(`
    SELECT id FROM competences_maternelle
    WHERE ecole_id = ? AND eleve_id = ? AND periode = ? AND domaine = ? AND competence = ?
  `).get(user.ecole_id, body.eleve_id, body.periode, body.domaine, body.competence)

  if (existing) {
    db.prepare(`
      UPDATE competences_maternelle
      SET statut = ?, observation = ?, saisie_par = ?
      WHERE id = ?
    `).run(body.statut, body.observation || null, user.id, (existing as any).id)
  } else {
    db.prepare(`
      INSERT INTO competences_maternelle
        (ecole_id, eleve_id, periode, domaine, competence, statut, observation, saisie_par)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.ecole_id, body.eleve_id, body.periode,
      body.domaine, body.competence, body.statut,
      body.observation || null, user.id
    )
  }

  return NextResponse.json({ success: true })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const db = getDb()

  // Sauvegarde domaines personnalisés
  db.prepare(`
    INSERT INTO parametres_maternelle (ecole_id, valeur)
    VALUES (?, ?)
    ON CONFLICT(ecole_id) DO UPDATE SET valeur = excluded.valeur
  `).run(user.ecole_id, JSON.stringify(body.domaines))

  return NextResponse.json({ success: true })
}