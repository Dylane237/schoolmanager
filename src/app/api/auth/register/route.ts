import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../../lib/db-server'
import { hashPassword, signToken, setAuthCookie } from '../../../../lib/auth'
import { slugify } from '../../../../lib/utils/slug'
import { getMachineFingerprint } from '../../../../lib/paths'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email, password, nom_ecole, slug, telephone,
      directeur_nom, sections, cle_licence,
    } = body

    if (!email || !password || !nom_ecole || !directeur_nom || !cle_licence) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe : 8 caractères minimum' }, { status: 400 })
    }

    const db = getDb()
    const finalSlug = (slug || slugify(nom_ecole)).toLowerCase()

    const existingSlug = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(finalSlug)
    if (existingSlug) {
      return NextResponse.json({ error: 'Cet identifiant URL est déjà utilisé' }, { status: 409 })
    }

    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existingEmail) {
      return NextResponse.json({ error: 'Cet email est déjà enregistré' }, { status: 409 })
    }

    const licence = db.prepare(`
      SELECT * FROM licences WHERE UPPER(cle_licence) = ? AND is_active = 1
    `).get(cle_licence.trim().toUpperCase()) as {
      id: string; ecole_id: string | null; date_fin: string
    } | undefined

    if (!licence) {
      return NextResponse.json({ error: 'Clé de licence invalide' }, { status: 400 })
    }

    if (licence.ecole_id) {
      return NextResponse.json({ error: 'Cette clé de licence est déjà utilisée' }, { status: 400 })
    }

    if (licence.date_fin < new Date().toISOString().split('T')[0]) {
      return NextResponse.json({ error: 'Cette clé de licence a expiré' }, { status: 400 })
    }

    const sectionsJson = JSON.stringify(sections || ['francophone'])

    db.prepare(`
      INSERT INTO ecoles (nom, slug, telephone, directeur_nom, sections, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nom_ecole, finalSlug, telephone || null, directeur_nom, sectionsJson, email)

    const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(finalSlug) as { id: string }

    const fingerprint = getMachineFingerprint()
    db.prepare(`
      UPDATE licences SET ecole_id = ?, machine_fingerprint = ?
      WHERE id = ?
    `).run(ecole.id, fingerprint, licence.id)

    const year = new Date().getFullYear()
    const month = new Date().getMonth()
    const startYear = month >= 8 ? year : year - 1
    const anneeLabel = `${startYear}-${startYear + 1}`

    db.prepare(`
      INSERT INTO annees_scolaires (ecole_id, label, date_debut, date_fin, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(ecole.id, anneeLabel, `${startYear}-09-01`, `${startYear + 1}-07-31`)

    const passwordHash = await hashPassword(password)
    db.prepare(`
      INSERT INTO users (email, password_hash, nom, role, ecole_id)
      VALUES (?, ?, ?, 'admin', ?)
    `).run(email, passwordHash, directeur_nom, ecole.id)

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string }

    const token = await signToken({
      id: user.id,
      role: 'admin',
      ecole_id: ecole.id,
      ecole_slug: finalSlug,
      nom: directeur_nom,
    })

    const response = NextResponse.json({
      success: true,
      slug: finalSlug,
      user: { ecole_slug: finalSlug, role: 'admin', nom: directeur_nom },
    })
    setAuthCookie(response, token)
    return response
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Erreur lors de la création du compte' }, { status: 500 })
  }
}
