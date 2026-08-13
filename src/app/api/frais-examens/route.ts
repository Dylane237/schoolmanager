import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getActiveAnneeScolaire } from '../../../lib/db-server'
import {
  getFraisExamenConfig,
  getFraisExamenSituationForEleve,
  getFraisExamenResumeForClasse,
} from '../../../lib/frais-examens-utils'
import { requireModule } from '../../../lib/rbac.server'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../lib/school-api'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'GET')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const classeId = searchParams.get('classe_id')
  const eleveId = searchParams.get('eleve_id')

  const { db, ecoleId } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const annee = getActiveAnneeScolaire(db, ecoleId)

  if (eleveId) {
    const situation = getFraisExamenSituationForEleve(db, ecoleId, eleveId, annee)
    return NextResponse.json({ situation, annee_scolaire: annee })
  }

  if (!classeId) {
    return NextResponse.json({ error: 'classe_id ou eleve_id requis' }, { status: 400 })
  }

  const classe = db.prepare('SELECT id FROM classes WHERE id = ? AND ecole_id = ?').get(classeId, ecoleId)
  if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  const config = getFraisExamenConfig(db, ecoleId, classeId, annee)
  const resume = getFraisExamenResumeForClasse(db, ecoleId, classeId, annee)

  return NextResponse.json({
    frais_examen: config,
    eleves: resume.eleves,
    impayes: resume.impayes,
    annee_scolaire: annee,
  })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'POST')
  if (denied) return denied

  const body = await request.json()
  if (!body.classe_id) {
    return NextResponse.json({ error: 'classe_id requis' }, { status: 400 })
  }

  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const annee = body.annee_scolaire || getActiveAnneeScolaire(db, ecoleId)

  const classe = db.prepare('SELECT id FROM classes WHERE id = ? AND ecole_id = ?').get(body.classe_id, ecoleId)
  if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  db.prepare(`
    DELETE FROM frais_annexes
    WHERE ecole_id = ? AND classe_id = ? AND annee_scolaire = ? AND type = 'examen'
  `).run(ecoleId, body.classe_id, annee)

  const montant = Number(body.montant) || 0
  if (montant > 0 && body.label?.trim()) {
    db.prepare(`
      INSERT INTO frais_annexes (ecole_id, classe_id, label, montant, obligatoire, type, date_limite, annee_scolaire)
      VALUES (?, ?, ?, ?, 1, 'examen', ?, ?)
    `).run(
      ecoleId,
      body.classe_id,
      body.label.trim(),
      montant,
      body.date_limite || null,
      annee,
    )
  }

  const config = getFraisExamenConfig(db, ecoleId, body.classe_id, annee)
  const fraisId = config?.id as string | undefined
  return jsonPersist(ecoleSlug, { success: true, frais_examen: config }, undefined, fraisId ? {
    entity_type: 'frais_annexe',
    entity_id: fraisId,
    action: 'update',
    label: `Frais examen ${body.label?.trim() ?? ''}`.trim(),
    source: 'frais-examens',
  } : undefined)
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'DELETE')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const classeId = searchParams.get('classe_id')
  if (!classeId) return NextResponse.json({ error: 'classe_id requis' }, { status: 400 })

  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const annee = getActiveAnneeScolaire(db, ecoleId)

  db.prepare(`
    DELETE FROM frais_annexes
    WHERE ecole_id = ? AND classe_id = ? AND annee_scolaire = ? AND type = 'examen'
  `).run(ecoleId, classeId, annee)

  return jsonPersist(ecoleSlug, { success: true }, undefined, {
    entity_type: 'frais_annexe',
    entity_id: `${classeId}:${annee}`,
    action: 'delete',
    label: `Frais examen classe ${classeId}`,
    source: 'frais-examens',
  })
}
