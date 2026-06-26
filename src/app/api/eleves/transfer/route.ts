import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db-server'
import { requireModule } from '../../../../lib/rbac.server'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'eleves', 'PUT')
  if (denied) return denied

  const body = await request.json() as { eleve_id: string; classe_id: string | null }
  const { eleve_id, classe_id } = body

  if (!eleve_id) {
    return NextResponse.json({ error: 'eleve_id requis' }, { status: 400 })
  }

  const db = getDb()

  const eleve = db.prepare(
    'SELECT id, classe_id FROM eleves WHERE id = ? AND ecole_id = ? AND statut = ?'
  ).get(eleve_id, user.ecole_id, 'actif') as { id: string; classe_id: string | null } | undefined

  if (!eleve) {
    return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 })
  }

  if (classe_id) {
    const classe = db.prepare(
      'SELECT id, capacite_max, section FROM classes WHERE id = ? AND ecole_id = ?'
    ).get(classe_id, user.ecole_id) as { id: string; capacite_max: number; section: string } | undefined

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

    db.prepare('UPDATE eleves SET classe_id = ?, section = ? WHERE id = ?').run(
      classe_id, classe.section, eleve_id
    )
  } else {
    db.prepare('UPDATE eleves SET classe_id = NULL WHERE id = ?').run(eleve_id)
  }

  return NextResponse.json({ success: true })
}
