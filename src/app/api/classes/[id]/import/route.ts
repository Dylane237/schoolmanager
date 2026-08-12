import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../../lib/auth'
import { requireModule } from '../../../../../lib/rbac.server'
import { checkStudentLimit } from '../../../../../lib/licence-limits'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../../../lib/school-api'

interface ImportRow {
  matricule?: string
  nom?: string
  prenom?: string
  sexe?: string
}

function parseCsv(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []

  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ''))

  const matIdx = headers.findIndex(h => ['matricule', 'numero_matricule', 'n° matricule'].includes(h))
  const nomIdx = headers.findIndex(h => h === 'nom')
  const prenomIdx = headers.findIndex(h => ['prenom', 'prénom'].includes(h))
  const sexeIdx = headers.findIndex(h => h === 'sexe')

  const rows: ImportRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
    if (cols.every(c => !c)) continue
    rows.push({
      matricule: matIdx >= 0 ? cols[matIdx] : undefined,
      nom: nomIdx >= 0 ? cols[nomIdx] : undefined,
      prenom: prenomIdx >= 0 ? cols[prenomIdx] : undefined,
      sexe: sexeIdx >= 0 ? cols[sexeIdx]?.toUpperCase() : undefined,
    })
  }
  return rows
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'eleves', 'POST')
  if (denied) return denied

  const { id: classeId } = await params
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const classe = db.prepare(
    'SELECT id, capacite_max, section FROM classes WHERE id = ? AND ecole_id = ?'
  ).get(classeId, ecoleId) as { id: string; capacite_max: number; section: string } | undefined

  if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier CSV requis' }, { status: 400 })

  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Fichier CSV vide ou format invalide' }, { status: 400 })
  }

  const nbActuels = (db.prepare(
    'SELECT COUNT(*) as count FROM eleves WHERE classe_id = ? AND statut = ?'
  ).get(classeId, 'actif') as { count: number })?.count ?? 0

  let assigned = 0
  let created = 0
  const errors: string[] = []

  const assignEleve = db.prepare(
    'UPDATE eleves SET classe_id = ?, section = ? WHERE id = ? AND ecole_id = ?'
  )

  for (const row of rows) {
    if (nbActuels + assigned + created >= classe.capacite_max) {
      errors.push('Capacité de la classe atteinte')
      break
    }

    if (row.matricule) {
      const existing = db.prepare(
        'SELECT id FROM eleves WHERE numero_matricule = ? AND ecole_id = ?'
      ).get(row.matricule.trim(), ecoleId) as { id: string } | undefined

      if (existing) {
        assignEleve.run(classeId, classe.section, existing.id, ecoleId)
        assigned++
        continue
      }
    }

    if (row.nom && row.prenom) {
      const limitError = checkStudentLimit(db, ecoleId)
      if (limitError) {
        errors.push(limitError)
        break
      }

      const year = new Date().getFullYear().toString().slice(-2)
      const count = (db.prepare(
        'SELECT COUNT(*) as count FROM eleves WHERE ecole_id = ?'
      ).get(ecoleId) as { count: number })?.count ?? 0
      const matricule = row.matricule?.trim() || `ELV-${year}-${String(count + 1).padStart(4, '0')}`

      db.prepare(`
        INSERT INTO eleves (ecole_id, classe_id, numero_matricule, nom, prenom, sexe, section, annee_entree, statut)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'actif')
      `).run(
        ecoleId, classeId, matricule, row.nom, row.prenom,
        row.sexe === 'F' || row.sexe === 'M' ? row.sexe : null,
        classe.section, new Date().getFullYear().toString()
      )
      created++
    } else {
      errors.push(`Ligne ignorée : matricule "${row.matricule ?? '?'}" introuvable et nom/prénom manquants`)
    }
  }

  return jsonPersist(ecoleSlug, {
    success: true,
    assigned,
    created,
    total: assigned + created,
    errors: errors.length ? errors : undefined,
  })
}
