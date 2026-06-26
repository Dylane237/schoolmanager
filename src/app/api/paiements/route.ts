import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb } from '../../../lib/db-server'
import { countImpayes, getElevesSituation } from '../../../lib/paiements-utils'
import { requireModule } from '../../../lib/rbac.server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'GET')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view')

  const db = getDb()

  if (view === 'situation') {
    const classe_id = searchParams.get('classe_id') || undefined
    const search = searchParams.get('search') || undefined
    const eleve_id = searchParams.get('eleve_id') || undefined

    const { situations, annee_scolaire } = getElevesSituation(db, user.ecole_id, {
      classeId: classe_id,
      search,
    })

    if (eleve_id) {
      const one = situations.find(s => s.eleve_id === eleve_id) ?? null
      return NextResponse.json({ situation: one, annee_scolaire })
    }

    return NextResponse.json({ situations, annee_scolaire })
  }
  const eleve_id = searchParams.get('eleve_id')
  const mois = searchParams.get('mois')

  let query = `
    SELECT
      p.*,
      e.nom as eleve_nom,
      e.prenom as eleve_prenom,
      e.numero_matricule,
      c.nom as classe_nom
    FROM paiements p
    LEFT JOIN eleves e ON e.id = p.eleve_id
    LEFT JOIN classes c ON c.id = e.classe_id
    WHERE p.ecole_id = ?
  `
  const params: unknown[] = [user.ecole_id]

  if (eleve_id) { query += ' AND p.eleve_id = ?'; params.push(eleve_id) }
  if (mois) { query += ` AND strftime('%Y-%m', p.date_paiement) = ?`; params.push(mois) }

  query += ' ORDER BY p.created_at DESC'

  const paiements = db.prepare(query).all(...params)

  const today = new Date().toISOString().split('T')[0]
  const debutMois = today.slice(0, 7) + '-01'

  const statsToday = db.prepare(`
    SELECT COALESCE(SUM(montant), 0) as total
    FROM paiements WHERE ecole_id = ? AND date_paiement = ?
  `).get(user.ecole_id, today) as { total: number }

  const statsMois = db.prepare(`
    SELECT COALESCE(SUM(montant), 0) as total
    FROM paiements WHERE ecole_id = ? AND date_paiement >= ?
  `).get(user.ecole_id, debutMois) as { total: number }

  const statsImpaye = countImpayes(getElevesSituation(db, user.ecole_id).situations)

  const retards = db.prepare(`
    SELECT
      e.id as eleve_id,
      e.nom,
      e.prenom,
      e.numero_matricule,
      c.nom as classe_nom,
      tc.tranche_numero,
      tc.montant_attendu,
      tc.date_limite,
      COALESCE((
        SELECT SUM(p.montant) FROM paiements p
        WHERE p.eleve_id = e.id AND p.tranche_numero = tc.tranche_numero
      ), 0) as montant_paye,
      CAST(julianday('now') - julianday(tc.date_limite) AS INTEGER) as jours_retard
    FROM eleves e
    JOIN classes c ON c.id = e.classe_id
    JOIN tranches_config tc ON tc.classe_id = e.classe_id
    WHERE e.ecole_id = ? AND e.statut = 'actif'
    AND tc.date_limite IS NOT NULL
    AND tc.date_limite < date('now')
    AND COALESCE((
      SELECT SUM(p.montant) FROM paiements p
      WHERE p.eleve_id = e.id AND p.tranche_numero = tc.tranche_numero
    ), 0) < tc.montant_attendu
    ORDER BY jours_retard DESC
  `).all(user.ecole_id)

  const retardsCritiques = (retards as { jours_retard: number }[]).filter(r => r.jours_retard >= 3)

  return NextResponse.json({
    paiements,
    stats: {
      today: statsToday?.total ?? 0,
      mois: statsMois?.total ?? 0,
      impaye: statsImpaye,
      retards: retards.length,
      retardsCritiques: retardsCritiques.length,
    },
    retards,
  })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'POST')
  if (denied) return denied

  const body = await request.json()
  const db = getDb()

  const year = new Date().getFullYear()
  const count = (db.prepare(`
    SELECT COUNT(*) as count FROM paiements
    WHERE ecole_id = ? AND strftime('%Y', created_at) = ?
  `).get(user.ecole_id, String(year)) as { count: number })?.count ?? 0
  const recu_numero = `REC-${year}-${String(count + 1).padStart(5, '0')}`

  const eleve = db.prepare(`
    SELECT e.*, c.nom as classe_nom
    FROM eleves e LEFT JOIN classes c ON c.id = e.classe_id
    WHERE e.id = ? AND e.ecole_id = ?
  `).get(body.eleve_id, user.ecole_id) as Record<string, unknown> | undefined

  if (!eleve) {
    return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 })
  }

  db.prepare(`
    INSERT INTO paiements (
      ecole_id, eleve_id, tranche_numero, montant,
      date_paiement, mode_paiement, recu_numero, enregistre_par
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.ecole_id, body.eleve_id, body.tranche_numero,
    body.montant, body.date_paiement || new Date().toISOString().split('T')[0],
    body.mode_paiement, recu_numero, user.id
  )

  const ecole = db.prepare('SELECT nom, directeur_nom FROM ecoles WHERE id = ?')
    .get(user.ecole_id) as { nom: string; directeur_nom: string }

  return NextResponse.json({
    success: true,
    recu_numero,
    recu: {
      numero: recu_numero,
      ecole: ecole?.nom,
      directeur: ecole?.directeur_nom,
      eleve_nom: eleve.nom,
      eleve_prenom: eleve.prenom,
      matricule: eleve.numero_matricule,
      classe: eleve.classe_nom,
      tranche: body.tranche_numero,
      montant: body.montant,
      mode: body.mode_paiement,
      date: body.date_paiement || new Date().toISOString().split('T')[0],
    },
  })
}
