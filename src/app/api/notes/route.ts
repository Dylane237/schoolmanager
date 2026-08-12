import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { validateNote } from '../../../lib/notes-utils'
import { requireModule } from '../../../lib/rbac.server'
import { logAudit } from '../../../lib/audit-log'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../lib/school-api'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'notes', 'GET')
  if (denied) return denied

  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const classe_id = searchParams.get('classe_id')
  const matiere_id = searchParams.get('matiere_id')
  const periode = searchParams.get('periode')

  const matieres = db.prepare(`
    SELECT * FROM matieres WHERE ecole_id = ?
    ${classe_id ? 'AND classe_id = ?' : ''}
    ORDER BY nom
  `).all(...[ecoleId, ...(classe_id ? [classe_id] : [])])

  if (!classe_id) return NextResponse.json({ matieres, notes: [] })

  const classe = db.prepare(
    'SELECT section FROM classes WHERE id = ? AND ecole_id = ?'
  ).get(classe_id, ecoleId) as { section: string } | undefined

  if (!classe) {
    return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })
  }

  const eleves = db.prepare(`
    SELECT id, nom, prenom, numero_matricule, section
    FROM eleves WHERE ecole_id = ? AND classe_id = ? AND statut = 'actif'
    ORDER BY nom
  `).all(ecoleId, classe_id)

  let notes: unknown[] = []
  if (matiere_id && periode) {
    notes = db.prepare(`
      SELECT * FROM notes
      WHERE ecole_id = ? AND matiere_id = ? AND periode = ?
    `).all(ecoleId, matiere_id, periode)
  }

  return NextResponse.json({ matieres, eleves, notes, section: classe.section })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'notes', 'POST')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const eleve = db.prepare('SELECT section FROM eleves WHERE id = ? AND ecole_id = ?')
    .get(body.eleve_id, ecoleId) as { section: string } | undefined

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
  `).get(body.eleve_id, body.matiere_id, body.periode) as { id: string } | undefined

  if (existing) {
    db.prepare(`
      UPDATE notes SET note = ?, appreciation = ?, saisie_par = ?
      WHERE eleve_id = ? AND matiere_id = ? AND periode = ?
    `).run(body.note, body.appreciation || null, user.id,
       body.eleve_id, body.matiere_id, body.periode)

    logAudit(db, {
      ecoleId,
      userId: user.id,
      action: 'update',
      module: 'notes',
      entityId: existing.id,
      details: { eleve_id: body.eleve_id, matiere_id: body.matiere_id, periode: body.periode, note: body.note },
    })
  } else {
    db.prepare(`
      INSERT INTO notes (ecole_id, eleve_id, matiere_id, periode, note, appreciation, saisie_par)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(ecoleId, body.eleve_id, body.matiere_id,
       body.periode, body.note, body.appreciation || null, user.id)

    const created = db.prepare(`
      SELECT id FROM notes WHERE eleve_id = ? AND matiere_id = ? AND periode = ?
    `).get(body.eleve_id, body.matiere_id, body.periode) as { id: string }

    logAudit(db, {
      ecoleId,
      userId: user.id,
      action: 'create',
      module: 'notes',
      entityId: created?.id,
      details: { eleve_id: body.eleve_id, matiere_id: body.matiere_id, periode: body.periode, note: body.note },
    })
  }

  return jsonPersist(ecoleSlug, { success: true }, undefined, {
    entity_type: 'note',
    entity_id: body.eleve_id && body.matiere_id ? (
      (db.prepare(`
        SELECT id FROM notes WHERE eleve_id = ? AND matiere_id = ? AND periode = ?
      `).get(body.eleve_id, body.matiere_id, body.periode) as { id: string } | undefined)?.id ?? null
    ) : null,
    action: 'update',
    label: `Note ${body.note}/100 — période ${body.periode}`,
    source: 'notes',
  })
}
