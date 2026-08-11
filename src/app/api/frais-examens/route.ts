import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb, getActiveAnneeScolaire } from '../../../lib/db-server'
import {
  getFraisExamenConfig,
  getFraisExamenSituationForEleve,
  getFraisExamenResumeForClasse,
} from '../../../lib/frais-examens-utils'
import { requireModule } from '../../../lib/rbac.server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'GET')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const classeId = searchParams.get('classe_id')
  const eleveId = searchParams.get('eleve_id')
  const db = getDb()
  const annee = getActiveAnneeScolaire(db, user.ecole_id)

  if (eleveId) {
    const situation = getFraisExamenSituationForEleve(db, user.ecole_id, eleveId, annee)
    return NextResponse.json({ situation, annee_scolaire: annee })
  }

  if (!classeId) {
    return NextResponse.json({ error: 'classe_id ou eleve_id requis' }, { status: 400 })
  }

  const classe = db.prepare('SELECT id FROM classes WHERE id = ? AND ecole_id = ?').get(classeId, user.ecole_id)
  if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  const config = getFraisExamenConfig(db, user.ecole_id, classeId, annee)
  const resume = getFraisExamenResumeForClasse(db, user.ecole_id, classeId, annee)

  return NextResponse.json({
    frais_examen: config,
    eleves: resume.eleves,
    impayes: resume.impayes,
    annee_scolaire: annee,
  })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'POST')
  if (denied) return denied

  const body = await request.json()
  if (!body.classe_id) {
    return NextResponse.json({ error: 'classe_id requis' }, { status: 400 })
  }

  const db = getDb()
  const annee = body.annee_scolaire || getActiveAnneeScolaire(db, user.ecole_id)

  const classe = db.prepare('SELECT id FROM classes WHERE id = ? AND ecole_id = ?').get(body.classe_id, user.ecole_id)
  if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  db.prepare(`
    DELETE FROM frais_annexes
    WHERE ecole_id = ? AND classe_id = ? AND annee_scolaire = ? AND type = 'examen'
  `).run(user.ecole_id, body.classe_id, annee)

  const montant = Number(body.montant) || 0
  if (montant > 0 && body.label?.trim()) {
    db.prepare(`
      INSERT INTO frais_annexes (ecole_id, classe_id, label, montant, obligatoire, type, date_limite, annee_scolaire)
      VALUES (?, ?, ?, ?, 1, 'examen', ?, ?)
    `).run(
      user.ecole_id,
      body.classe_id,
      body.label.trim(),
      montant,
      body.date_limite || null,
      annee,
    )
  }

  const config = getFraisExamenConfig(db, user.ecole_id, body.classe_id, annee)
  return NextResponse.json({ success: true, frais_examen: config })
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'DELETE')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const classeId = searchParams.get('classe_id')
  if (!classeId) return NextResponse.json({ error: 'classe_id requis' }, { status: 400 })

  const db = getDb()
  const annee = getActiveAnneeScolaire(db, user.ecole_id)

  db.prepare(`
    DELETE FROM frais_annexes
    WHERE ecole_id = ? AND classe_id = ? AND annee_scolaire = ? AND type = 'examen'
  `).run(user.ecole_id, classeId, annee)

  return NextResponse.json({ success: true })
}
