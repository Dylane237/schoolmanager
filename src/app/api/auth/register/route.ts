import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../../lib/db-server'
import { hashPassword, signToken, setAuthCookie } from '../../../../lib/auth'
import { uniqueSlug } from '../../../../lib/utils/slug'
import { getMachineFingerprint } from '../../../../lib/paths'
import { generateRecoveryCode, hashRecoveryCode } from '../../../../lib/recovery-code'
import { getDefaultAnneeScolaireBounds } from '../../../../lib/school-year'

const LICENCE_SERVER_URL = 'https://schoolmanager-eosin.vercel.app'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email, password, nom_ecole, telephone,
      directeur_nom, sections, cle_licence, code_parrain,
    } = body

    if (!email || !password || !nom_ecole || !directeur_nom || !cle_licence) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe : 8 caractères minimum' }, { status: 400 })
    }

    const db = getDb()
    const slugExists = (s: string) =>
      !!db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(s)
    const finalSlug = uniqueSlug(nom_ecole, slugExists)

    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase())
    if (existingEmail) {
      return NextResponse.json({ error: 'Cet email est déjà enregistré' }, { status: 409 })
    }

    // 1. Vérifier la licence sur Vercel
    const verifyRes = await fetch(
      `${LICENCE_SERVER_URL}/api/auth/verify-licence?cle=${encodeURIComponent(cle_licence.trim().toUpperCase())}`,
      {
        headers: { 'User-Agent': 'SchoolManager-Desktop/1.0' },
        signal: AbortSignal.timeout(8000),
      }
    )
    const verifyData = await verifyRes.json()

    if (!verifyData.valid) {
      return NextResponse.json({ error: verifyData.error || 'Clé de licence invalide' }, { status: 400 })
    }

    // 2. Créer l'école localement
    db.prepare(`
      INSERT INTO ecoles (nom, slug, telephone, directeur_nom, sections, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nom_ecole, finalSlug, telephone || null, directeur_nom, JSON.stringify(sections || ['francophone']), email)

    const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(finalSlug) as { id: string }

    // 3. Insérer la licence en local SQLite avec fingerprint
    const fingerprint = getMachineFingerprint()
    db.prepare(`
      INSERT OR IGNORE INTO licences (ecole_id, type, date_debut, date_fin, is_active, cle_licence, machine_fingerprint)
      VALUES (?, ?, date('now'), ?, 1, ?, ?)
    `).run(ecole.id, verifyData.plan, verifyData.date_fin, cle_licence.trim().toUpperCase(), fingerprint)

    // 4. Mettre en cache licence_cache
    db.prepare(`
      INSERT INTO licence_cache (cle, plan, date_fin, last_verified, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(cle) DO UPDATE SET
        plan = excluded.plan,
        date_fin = excluded.date_fin,
        last_verified = excluded.last_verified,
        is_active = 1
    `).run(
      cle_licence.trim().toUpperCase(),
      verifyData.plan,
      verifyData.date_fin,
      new Date().toISOString()
    )

    // 5. Marquer la licence comme utilisée sur Vercel (Supabase)
    try {
      await fetch(`${LICENCE_SERVER_URL}/api/auth/use-licence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SchoolManager-Desktop/1.0',
        },
        body: JSON.stringify({
          cle: cle_licence.trim().toUpperCase(),
          ecole_slug: finalSlug,
          ecole_nom: nom_ecole,
          parrain_code: code_parrain?.trim().toUpperCase() || null,
          machine_fingerprint: fingerprint,
        }),
        signal: AbortSignal.timeout(8000),
      })
    } catch (e) {
      console.warn('[register] use-licence failed (non bloquant):', e)
    }

    // 6. Année scolaire
    const { label: anneeLabel, date_debut, date_fin } = getDefaultAnneeScolaireBounds()

    db.prepare(`
      INSERT INTO annees_scolaires (ecole_id, label, date_debut, date_fin, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(ecole.id, anneeLabel, date_debut, date_fin)

    // 7. Créer l'utilisateur admin + code de secours
    const recoveryCode = generateRecoveryCode()
    const recoveryHash = await hashRecoveryCode(recoveryCode)
    const passwordHash = await hashPassword(password)
    db.prepare(`
      INSERT INTO users (email, password_hash, nom, role, ecole_id, recovery_code_hash)
      VALUES (?, ?, ?, 'admin', ?, ?)
    `).run(email.trim().toLowerCase(), passwordHash, directeur_nom, ecole.id, recoveryHash)

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase()) as { id: string }

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
      recovery_code: recoveryCode,
      user: { ecole_slug: finalSlug, role: 'admin', nom: directeur_nom },
    })
    setAuthCookie(response, token)
    return response

  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Erreur lors de la création du compte' }, { status: 500 })
  }
}