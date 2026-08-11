import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb, getActiveAnneeScolaire } from '../../../lib/db-server'
import { requireModule } from '../../../lib/rbac.server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'paiements', 'GET')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const classeId = searchParams.get('classe_id')

  const db = getDb()
  const annee = getActiveAnneeScolaire(db, user.ecole_id)

  const tranches = db.prepare(`
    SELECT tc.*, c.nom as classe_nom
    FROM tranches_config tc
    JOIN classes c ON c.id = tc.classe_id
    WHERE tc.ecole_id = ?
    ${classeId ? 'AND tc.classe_id = ?' : ''}
    AND tc.annee_scolaire = ?
    ORDER BY c.nom, tc.tranche_numero
  `).all(...[user.ecole_id, ...(classeId ? [classeId] : []), annee])

  const classes = db.prepare(`
    SELECT id, nom, section FROM classes WHERE ecole_id = ? ORDER BY section, nom
  `).all(user.ecole_id)

  return NextResponse.json({ tranches, classes, annee_scolaire: annee })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'paiements', 'POST')
  if (denied) return denied

  const body = await request.json()
  if (!body.classe_id || !Array.isArray(body.tranches)) {
    return NextResponse.json({ error: 'classe_id et tranches requis' }, { status: 400 })
  }

  const db = getDb()
  const annee = body.annee_scolaire || getActiveAnneeScolaire(db, user.ecole_id)

  const classe = db.prepare('SELECT id FROM classes WHERE id = ? AND ecole_id = ?').get(body.classe_id, user.ecole_id)
  if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  db.prepare(`
    DELETE FROM tranches_config WHERE ecole_id = ? AND classe_id = ? AND annee_scolaire = ?
  `).run(user.ecole_id, body.classe_id, annee)

  const insert = db.prepare(`
    INSERT INTO tranches_config (ecole_id, classe_id, tranche_numero, montant_attendu, date_limite, annee_scolaire)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  for (const t of body.tranches) {
    if (t.montant_attendu > 0) {
      insert.run(user.ecole_id, body.classe_id, t.tranche_numero, t.montant_attendu, t.date_limite || null, annee)
    }
  }

  return NextResponse.json({ success: true })
}
