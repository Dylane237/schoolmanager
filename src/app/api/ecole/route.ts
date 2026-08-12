import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { requireModule } from '../../../lib/rbac.server'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../lib/school-api'

const ALLOWED_FIELDS = [
  'nom', 'telephone', 'adresse', 'email',
  'directeur_nom', 'logo_url', 'entete_url', 'nom_caissier',
] as const

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const ecole = db.prepare('SELECT * FROM ecoles WHERE id = ?').get(ecoleId)
  return NextResponse.json({ ecole })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const denied = requireModule(user, 'parametres', 'PUT')
  if (denied) return denied

  const body = await request.json()
  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const fields = ALLOWED_FIELDS.filter(f =>
    Object.prototype.hasOwnProperty.call(body, f)
  )

  if (fields.length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  if (fields.includes('nom') && !body.nom) {
    return NextResponse.json({ error: "Le nom de l'établissement est requis" }, { status: 400 })
  }

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => {
    const v = body[f]
    return v === '' ? null : (v ?? null)
  })

  db.prepare(`UPDATE ecoles SET ${setClause} WHERE id = ?`).run(...values, ecoleId)

  return jsonPersist(ecoleSlug, { success: true })
}
