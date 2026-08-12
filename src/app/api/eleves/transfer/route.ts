import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../lib/auth'
import { requireModule } from '../../../../lib/rbac.server'
import { regenerateMatriculeOnTransfer } from '../../../../lib/matricule'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../../lib/school-api'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'eleves', 'PUT')
  if (denied) return denied

  const body = await request.json() as { eleve_id: string; classe_id: string | null }
  const { eleve_id, classe_id } = body

  if (!eleve_id) {
    return NextResponse.json({ error: 'eleve_id requis' }, { status: 400 })
  }

  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const eleve = db.prepare(
    'SELECT id, classe_id, numero_matricule FROM eleves WHERE id = ? AND ecole_id = ? AND statut = ?'
  ).get(eleve_id, ecoleId, 'actif') as { id: string; classe_id: string | null; numero_matricule: string } | undefined

  if (!eleve) {
    return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 })
  }

  const ancienMatricule = eleve.numero_matricule

  if (classe_id) {
    const classe = db.prepare(
      'SELECT id, capacite_max, section FROM classes WHERE id = ? AND ecole_id = ?'
    ).get(classe_id, ecoleId) as { id: string; capacite_max: number; section: string } | undefined

    if (!classe) {
      return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })
    }

    const nbEleves = (db.prepare(
      'SELECT COUNT(*) as count FROM eleves WHERE classe_id = ? AND statut = ? AND id != ?'
    ).get(classe_id, 'actif', eleve_id) as { count: number })?.count ?? 0

    if (nbEleves >= classe.capacite_max) {
      return NextResponse.json({
        error: `Classe pleine (${classe.capacite_max} élèves max)`,
        classe_pleine: true,
      }, { status: 400 })
    }

    const nouveauMatricule = regenerateMatriculeOnTransfer(
      db, ecoleId, eleve_id, classe_id
    )

    db.prepare(`
      INSERT INTO academic_histories (ecole_id, eleve_id, classe_id, annee, statut)
      VALUES (?, ?, ?, ?, 'admis')
      ON CONFLICT DO NOTHING
    `).run(
      ecoleId,
      eleve_id,
      eleve.classe_id,
      new Date().getFullYear().toString()
    )

    db.prepare(`
      UPDATE eleves SET classe_id = ?, section = ?, numero_matricule = ?
      WHERE id = ?
    `).run(classe_id, classe.section, nouveauMatricule, eleve_id)

    return jsonPersist(ecoleSlug, {
      success: true,
      ancien_matricule: ancienMatricule,
      nouveau_matricule: nouveauMatricule,
    })
  }

  db.prepare('UPDATE eleves SET classe_id = NULL WHERE id = ?').run(eleve_id)
  return jsonPersist(ecoleSlug, { success: true })
}
