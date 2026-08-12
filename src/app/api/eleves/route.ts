import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getActiveAnneeScolaire } from '../../../lib/db-server'
import { sqlTotalAttenduEleve } from '../../../lib/paiements-utils'
import { checkStudentLimit } from '../../../lib/licence-limits'
import { requireModule } from '../../../lib/rbac.server'
import { generateMatricule } from '../../../lib/matricule'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist, persistSchoolWrite } from '../../../lib/school-api'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'eleves', 'GET')
  if (denied) return denied

  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const classe_id = searchParams.get('classe_id')
  const section = searchParams.get('section')
  const statut_paiement = searchParams.get('statut_paiement')
  const search = searchParams.get('search')

  const annee = getActiveAnneeScolaire(db, ecoleId)
  const totalAttenduSql = sqlTotalAttenduEleve('?')

  let query = `
    SELECT
      e.*,
      c.nom as classe_nom,
      c.section as classe_section,
      p.nom as parent_nom,
      p.telephone as parent_telephone,
      COALESCE((SELECT SUM(pa.montant) FROM paiements pa WHERE pa.eleve_id = e.id), 0) as total_paye,
      ${totalAttenduSql} as total_attendu
    FROM eleves e
    LEFT JOIN classes c ON c.id = e.classe_id
    LEFT JOIN parents p ON p.eleve_id = e.id AND p.est_principal = 1
    WHERE e.ecole_id = ?
  `
  const params: unknown[] = [annee, annee, ecoleId]

  if (classe_id) {
    if (classe_id === '__none__') {
      query += ' AND (e.classe_id IS NULL OR e.classe_id = "")'
    } else {
      query += ' AND e.classe_id = ?'
      params.push(classe_id)
    }
  }
  if (section)   { query += ' AND e.section = ?';   params.push(section)   }
  if (search) {
    query += ' AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.numero_matricule LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  query += ' ORDER BY e.nom ASC'

  let eleves = db.prepare(query).all(...params) as Record<string, unknown>[]

  if (eleves.length === 0 && user.ecole_slug && process.env.VERCEL) {
    const { hydrateStructuredSchoolData } = await import('../../../lib/school-db')
    const hydrated = await hydrateStructuredSchoolData(db, user.ecole_slug)
    if (hydrated) {
      await persistSchoolWrite(user.ecole_slug)
      eleves = db.prepare(query).all(...params) as Record<string, unknown>[]
    }
  }

  if (statut_paiement && statut_paiement !== 'tous') {
    eleves = eleves.filter((el) => {
      const reste = (el.total_attendu as number) - (el.total_paye as number)
      if (statut_paiement === 'paye')    return reste <= 0
      if (statut_paiement === 'partiel') return reste > 0 && (el.total_paye as number) > 0
      if (statut_paiement === 'impaye')  return (el.total_paye as number) === 0
      return true
    })
  }

  return NextResponse.json({ eleves })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'eleves', 'POST')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const limitError = checkStudentLimit(db, ecoleId)
  if (limitError) {
    return NextResponse.json({ error: limitError, limite_atteinte: true }, { status: 403 })
  }

  if (body.classe_id) {
    const classe = db.prepare(
      'SELECT capacite_max FROM classes WHERE id = ? AND ecole_id = ?'
    ).get(body.classe_id, ecoleId) as { capacite_max: number } | undefined

    if (!classe) {
      return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })
    }

    const nbEleves = (db.prepare(
      'SELECT COUNT(*) as count FROM eleves WHERE classe_id = ? AND statut = ?'
    ).get(body.classe_id, 'actif') as { count: number })?.count ?? 0

    if (nbEleves >= classe.capacite_max) {
      return NextResponse.json({
        error: `Classe pleine (${classe.capacite_max} élèves max)`,
        classe_pleine: true
      }, { status: 400 })
    }
  }

  const anneeArrivee = new Date().getFullYear()
  let matricule: string

  if (body.classe_id) {
    matricule = generateMatricule(db, ecoleId, body.classe_id, anneeArrivee)
  } else {
    const year = anneeArrivee.toString().slice(-2)
    const last = db.prepare(`
      SELECT numero_matricule FROM eleves
      WHERE ecole_id = ? AND numero_matricule LIKE 'PROV-${year}-%'
      ORDER BY numero_matricule DESC LIMIT 1
    `).get(ecoleId) as { numero_matricule: string } | undefined

    let nextNum = 1
    if (last) {
      const parts = last.numero_matricule.split('-')
      nextNum = parseInt(parts[parts.length - 1]) + 1
    }
    matricule = `PROV-${year}-${String(nextNum).padStart(3, '0')}`
  }

  db.prepare(`
    INSERT INTO eleves (
      ecole_id, classe_id, numero_matricule, nom, prenom,
      date_naissance, lieu_naissance, sexe, section, annee_entree, photo_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ecoleId, body.classe_id?.trim() || null, matricule,
    body.nom, body.prenom, body.date_naissance || null,
    body.lieu_naissance || null, body.sexe, body.section,
    anneeArrivee.toString(),
    body.photo_url || null
  )

  const eleve = db.prepare('SELECT id FROM eleves WHERE numero_matricule = ?').get(matricule) as { id: string }

  if (body.parent_nom && body.parent_telephone) {
    db.prepare(`
      INSERT INTO parents (eleve_id, nom, prenom, telephone, lien, est_principal)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(eleve.id, body.parent_nom, body.parent_prenom || null, body.parent_telephone, body.parent_lien || 'tuteur')
  }

  return jsonPersist(ecoleSlug, { success: true, matricule, id: eleve.id })
}
