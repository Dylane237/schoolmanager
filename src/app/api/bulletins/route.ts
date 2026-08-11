import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb } from '../../../lib/db-server'
import { getNoteMax, getGradeAnglophone, getMentionFrancophone } from '../../../lib/notes-utils'
import { requireModule } from '../../../lib/rbac.server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'bulletins', 'GET')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const classe_id = searchParams.get('classe_id')
  const periode = searchParams.get('periode')
  const eleve_id = searchParams.get('eleve_id')

  if (!classe_id || !periode) {
    return NextResponse.json({ error: 'classe_id et periode requis' }, { status: 400 })
  }

  const db = getDb()

  const classe = db.prepare('SELECT * FROM classes WHERE id = ? AND ecole_id = ?')
    .get(classe_id, user.ecole_id) as { nom: string; section: string } | undefined

  if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  const ecole = db.prepare(`
    SELECT nom, directeur_nom, adresse, telephone, email, entete_url
    FROM ecoles WHERE id = ?
  `).get(user.ecole_id) as {
    nom: string; directeur_nom: string; adresse: string
    telephone: string; email: string; entete_url: string | null
  }

  const anneeRow = db.prepare(
    'SELECT label FROM annees_scolaires WHERE ecole_id = ? AND is_active = 1 LIMIT 1'
  ).get(user.ecole_id) as { label: string } | undefined
  const anneeScolaire = anneeRow?.label ?? null

  const matieres = db.prepare(`
    SELECT id, nom, coefficient FROM matieres
    WHERE ecole_id = ? AND classe_id = ?
    ORDER BY nom
  `).all(user.ecole_id, classe_id) as { id: string; nom: string; coefficient: number }[]

  let elevesQuery = `
    SELECT id, nom, prenom, numero_matricule, sexe, date_naissance, lieu_naissance
    FROM eleves WHERE ecole_id = ? AND classe_id = ? AND statut = 'actif'
  `
  const eleveParams: unknown[] = [user.ecole_id, classe_id]

  if (eleve_id) {
    elevesQuery += ' AND id = ?'
    eleveParams.push(eleve_id)
  }
  elevesQuery += ' ORDER BY nom, prenom'

  const eleves = db.prepare(elevesQuery).all(...eleveParams) as {
    id: string; nom: string; prenom: string; numero_matricule: string; sexe: string
    date_naissance: string | null; lieu_naissance: string | null
  }[]

  const effectif = eleves.length

  const noteMax = getNoteMax(classe.section)

  const bulletins = eleves.map(eleve => {
    const notesMatiere = matieres.map(m => {
      const note = db.prepare(`
        SELECT note, appreciation FROM notes
        WHERE eleve_id = ? AND matiere_id = ? AND periode = ?
      `).get(eleve.id, m.id, periode) as { note: number; appreciation: string } | undefined

      return {
        matiere: m.nom,
        coefficient: m.coefficient,
        note: note?.note ?? null,
        appreciation: note?.appreciation ?? null,
      }
    })

    const notesValides = notesMatiere.filter(n => n.note !== null)
    const totalCoef = notesValides.reduce((s, n) => s + n.coefficient, 0)
    const totalPoints = notesValides.reduce((s, n) => s + (n.note! * n.coefficient), 0)
    const moyenne = totalCoef > 0 ? totalPoints / totalCoef : null

    const mention = moyenne !== null
      ? (classe.section === 'anglophone'
          ? getGradeAnglophone(moyenne)
          : getMentionFrancophone(moyenne))
      : null

    const rangRows = db.prepare(`
      SELECT e.id,
        CASE WHEN SUM(m.coefficient) > 0
          THEN SUM(n.note * m.coefficient) / SUM(m.coefficient)
          ELSE 0 END as moy
      FROM eleves e
      JOIN notes n ON n.eleve_id = e.id AND n.periode = ?
      JOIN matieres m ON m.id = n.matiere_id
      WHERE e.classe_id = ? AND e.statut = 'actif'
      GROUP BY e.id
      ORDER BY moy DESC
    `).all(periode, classe_id) as { id: string; moy: number }[]

    const rang = rangRows.findIndex(r => r.id === eleve.id) + 1

    return {
      eleve: { ...eleve, id: eleve.id },
      notes: notesMatiere,
      moyenne,
      mention: mention?.label ?? null,
      rang: rang || null,
      noteMax,
    }
  })

  return NextResponse.json({
    ecole,
    classe,
    periode,
    section: classe.section,
    noteMax,
    anneeScolaire,
    effectif,
    bulletins,
  })
}
