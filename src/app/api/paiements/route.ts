import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { countImpayes, getElevesSituation } from '../../../lib/paiements-utils'
import { requireModule } from '../../../lib/rbac.server'
import { logAudit } from '../../../lib/audit-log'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../lib/school-api'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'GET')
  if (denied) return denied

  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view')

  if (view === 'situation') {
    const classe_id = searchParams.get('classe_id') || undefined
    const search = searchParams.get('search') || undefined
    const eleve_id = searchParams.get('eleve_id') || undefined
    const statut = searchParams.get('statut') || undefined

    const { situations, annee_scolaire } = getElevesSituation(db, ecoleId, {
      classeId: classe_id,
      search,
      statut,
    })

    if (eleve_id) {
      const one = situations.find(s => s.eleve_id === eleve_id) ?? null
      return NextResponse.json({ situation: one, annee_scolaire })
    }

    return NextResponse.json({ situations, annee_scolaire })
  }

  const eleve_id = searchParams.get('eleve_id')
  const mois = searchParams.get('mois')
  const search = searchParams.get('search')
  const classe_id = searchParams.get('classe_id')
  const mode = searchParams.get('mode')

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
  const params: unknown[] = [ecoleId]

  if (eleve_id) { query += ' AND p.eleve_id = ?'; params.push(eleve_id) }
  if (mois) { query += ` AND strftime('%Y-%m', p.date_paiement) = ?`; params.push(mois) }
  if (search) {
    query += ' AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.numero_matricule LIKE ? OR p.recu_numero LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (classe_id) { query += ' AND e.classe_id = ?'; params.push(classe_id) }
  if (mode) { query += ' AND p.mode_paiement = ?'; params.push(mode) }

  query += ' ORDER BY p.created_at DESC'

  const paiements = db.prepare(query).all(...params)

  const today = new Date().toISOString().split('T')[0]
  const debutMois = today.slice(0, 7) + '-01'

  const statsToday = db.prepare(`
    SELECT COALESCE(SUM(montant), 0) as total
    FROM paiements WHERE ecole_id = ? AND date_paiement = ?
  `).get(ecoleId, today) as { total: number }

  const statsMois = db.prepare(`
    SELECT COALESCE(SUM(montant), 0) as total
    FROM paiements WHERE ecole_id = ? AND date_paiement >= ?
  `).get(ecoleId, debutMois) as { total: number }

  const statsImpaye = countImpayes(getElevesSituation(db, ecoleId).situations)

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
  `).all(ecoleId)

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
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'POST')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const year = new Date().getFullYear()

  const lastRecu = db.prepare(`
    SELECT recu_numero FROM paiements
    WHERE ecole_id = ? AND recu_numero LIKE 'REC-${year}-%'
    ORDER BY recu_numero DESC LIMIT 1
  `).get(ecoleId) as { recu_numero: string } | undefined

  let nextNum = 1
  if (lastRecu) {
    const parts = lastRecu.recu_numero.split('-')
    nextNum = parseInt(parts[parts.length - 1]) + 1
  }

  let recu_numero = `REC-${year}-${String(nextNum).padStart(5, '0')}`
  while (db.prepare('SELECT id FROM paiements WHERE recu_numero = ?').get(recu_numero)) {
    nextNum++
    recu_numero = `REC-${year}-${String(nextNum).padStart(5, '0')}`
  }

  const eleve = db.prepare(`
    SELECT e.*, c.nom as classe_nom
    FROM eleves e LEFT JOIN classes c ON c.id = e.classe_id
    WHERE e.id = ? AND e.ecole_id = ?
  `).get(body.eleve_id, ecoleId) as Record<string, unknown> | undefined

  if (!eleve) {
    return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 })
  }

  const fraisAnnexeId = body.frais_annexe_id as string | undefined

  if (fraisAnnexeId) {
    const frais = db.prepare(`
      SELECT fa.* FROM frais_annexes fa
      WHERE fa.id = ? AND fa.ecole_id = ? AND fa.type = 'examen'
    `).get(fraisAnnexeId, ecoleId) as { id: string; classe_id: string; label: string; montant: number } | undefined

    if (!frais) {
      return NextResponse.json({ error: 'Frais d\'examen introuvable' }, { status: 404 })
    }
    if (frais.classe_id !== eleve.classe_id) {
      return NextResponse.json({ error: 'Cet élève n\'est pas concerné par ce frais d\'examen' }, { status: 400 })
    }

    db.prepare(`
      INSERT INTO paiements (
        ecole_id, eleve_id, frais_annexe_id, montant,
        date_paiement, mode_paiement, recu_numero, enregistre_par
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ecoleId, body.eleve_id, fraisAnnexeId,
      body.montant, body.date_paiement || new Date().toISOString().split('T')[0],
      body.mode_paiement, recu_numero, user.id
    )

    const inserted = db.prepare('SELECT id FROM paiements WHERE recu_numero = ?')
      .get(recu_numero) as { id: string }

    logAudit(db, {
      ecoleId,
      userId: user.id,
      userEmail: null,
      action: 'create',
      module: 'paiements',
      entityId: inserted.id,
      details: { montant: body.montant, eleve_id: body.eleve_id, frais_annexe_id: fraisAnnexeId, recu_numero },
    })

    const ecole = db.prepare('SELECT nom, directeur_nom, entete_url FROM ecoles WHERE id = ?')
      .get(ecoleId) as { nom: string; directeur_nom: string; entete_url: string | null }

    return jsonPersist(ecoleSlug, {
      success: true,
      recu_numero,
      recu: {
        id: inserted.id,
        recu_numero,
        numero: recu_numero,
        ecole: ecole?.nom,
        directeur: ecole?.directeur_nom,
        eleve_nom: eleve.nom,
        eleve_prenom: eleve.prenom,
        matricule: eleve.numero_matricule,
        classe: eleve.classe_nom,
        tranche: frais.label,
        montant: body.montant,
        mode: body.mode_paiement,
        date: body.date_paiement || new Date().toISOString().split('T')[0],
        entete_url: ecole?.entete_url || null,
      },
    }, undefined, {
      entity_type: 'paiement',
      entity_id: inserted.id,
      action: 'create',
      label: `Paiement ${body.montant} F — ${eleve.prenom} ${eleve.nom}`,
      source: 'paiements',
    })
  }

  db.prepare(`
    INSERT INTO paiements (
      ecole_id, eleve_id, tranche_numero, montant,
      date_paiement, mode_paiement, recu_numero, enregistre_par
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ecoleId, body.eleve_id, body.tranche_numero,
    body.montant, body.date_paiement || new Date().toISOString().split('T')[0],
    body.mode_paiement, recu_numero, user.id
  )

  const inserted = db.prepare('SELECT id FROM paiements WHERE recu_numero = ?')
    .get(recu_numero) as { id: string }

  logAudit(db, {
    ecoleId,
    userId: user.id,
    action: 'create',
    module: 'paiements',
    entityId: inserted.id,
    details: { montant: body.montant, eleve_id: body.eleve_id, tranche: body.tranche_numero, recu_numero },
  })

  const ecole = db.prepare('SELECT nom, directeur_nom, entete_url FROM ecoles WHERE id = ?')
    .get(ecoleId) as { nom: string; directeur_nom: string; entete_url: string | null }

  return jsonPersist(ecoleSlug, {
    success: true,
    recu_numero,
    recu: {
      id: inserted.id,
      recu_numero,
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
      entete_url: ecole?.entete_url || null,
    },
  }, undefined, {
    entity_type: 'paiement',
    entity_id: inserted.id,
    action: 'create',
    label: `Paiement ${body.montant} F — ${eleve.prenom} ${eleve.nom}`,
    source: 'paiements',
  })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'PUT')
  if (denied) return denied

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const paiement = db.prepare(
    'SELECT id FROM paiements WHERE id = ? AND ecole_id = ?'
  ).get(body.id, ecoleId)

  if (!paiement) {
    return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
  }

  db.prepare(`
    UPDATE paiements SET
      montant = ?,
      tranche_numero = ?,
      mode_paiement = ?,
      date_paiement = ?
    WHERE id = ? AND ecole_id = ?
  `).run(
    body.montant,
    body.tranche_numero,
    body.mode_paiement,
    body.date_paiement,
    body.id,
    ecoleId
  )

  logAudit(db, {
    ecoleId,
    userId: user.id,
    action: 'update',
    module: 'paiements',
    entityId: body.id,
    details: { montant: body.montant, tranche: body.tranche_numero },
  })

  return jsonPersist(ecoleSlug, { success: true })
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'DELETE')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const paiement = db.prepare(
    'SELECT id FROM paiements WHERE id = ? AND ecole_id = ?'
  ).get(id, ecoleId)

  if (!paiement) {
    return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
  }

  db.prepare('DELETE FROM paiements WHERE id = ? AND ecole_id = ?').run(id, ecoleId)

  logAudit(db, {
    ecoleId,
    userId: user.id,
    action: 'delete',
    module: 'paiements',
    entityId: id,
  })

  return jsonPersist(ecoleSlug, { success: true })
}
