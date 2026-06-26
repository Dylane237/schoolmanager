import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb } from '../../../lib/db-server'
import { validateNote } from '../../../lib/notes-utils'
import { requireModule } from '../../../lib/rbac.server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'notes', 'GET')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const classe_id = searchParams.get('classe_id')
  const matiere_id = searchParams.get('matiere_id')
  const periode = searchParams.get('periode')

  const db = getDb()

  const matieres = db.prepare(`
    SELECT * FROM matieres WHERE ecole_id = ?
    ${classe_id ? 'AND classe_id = ?' : ''}
    ORDER BY nom
  `).all(...[user.ecole_id, ...(classe_id ? [classe_id] : [])])

  if (!classe_id) return NextResponse.json({ matieres, notes: [] })

  const classe = db.prepare(
    'SELECT section FROM classes WHERE id = ? AND ecole_id = ?'
  ).get(classe_id, user.ecole_id) as { section: string } | undefined

  if (!classe) {
    return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })
  }

  const eleves = db.prepare(`
    SELECT id, nom, prenom, numero_matricule, section
    FROM eleves WHERE ecole_id = ? AND classe_id = ? AND statut = 'actif'
    ORDER BY nom
  `).all(user.ecole_id, classe_id)

  let notes: unknown[] = []
  if (matiere_id && periode) {
    notes = db.prepare(`
      SELECT * FROM notes
      WHERE ecole_id = ? AND matiere_id = ? AND periode = ?
    `).all(user.ecole_id, matiere_id, periode)
  }

  return NextResponse.json({ matieres, eleves, notes, section: classe.section })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'notes', 'POST')
  if (denied) return denied

  const body = await request.json()
  const db = getDb()

  const eleve = db.prepare('SELECT section FROM eleves WHERE id = ? AND ecole_id = ?')
    .get(body.eleve_id, user.ecole_id) as { section: string } | undefined

  if (!eleve) {
    return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 })
  }

  const noteError = validateNote(body.note, eleve.section)
  if (noteError) {
    return NextResponse.json({ error: noteError }, { status: 400 })
  }

  const existing = db.prepare(`
    SELECT id FROM notes
    WHERE eleve_id = ? AND matiere_id = ? AND periode = ?
  `).get(body.eleve_id, body.matiere_id, body.periode)

  if (existing) {
    db.prepare(`
      UPDATE notes SET note = ?, appreciation = ?, saisie_par = ?
      WHERE eleve_id = ? AND matiere_id = ? AND periode = ?
    `).run(body.note, body.appreciation || null, user.id,
       body.eleve_id, body.matiere_id, body.periode)
  } else {
    db.prepare(`
      INSERT INTO notes (ecole_id, eleve_id, matiere_id, periode, note, appreciation, saisie_par)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user.ecole_id, body.eleve_id, body.matiere_id,
       body.periode, body.note, body.appreciation || null, user.id)
  }

  return NextResponse.json({ success: true })
}
