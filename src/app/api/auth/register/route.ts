import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../../lib/db-server'
import { hashPassword, signToken, setAuthCookie } from '../../../../lib/auth'
import { uniqueSlug } from '../../../../lib/utils/slug'
import { getMachineFingerprint } from '../../../../lib/paths'
import { generateRecoveryCode, hashRecoveryCode } from '../../../../lib/recovery-code'
import { getDefaultAnneeScolaireBounds } from '../../../../lib/school-year'
import { LICENCE_SERVER_URL } from '../../../../lib/licence-server'
import {
  isCloudAuthAvailable,
  cloudEmailExists,
  uniqueCloudSlug,
  verifyLicenceKey,
  activateLicenceOnCloud,
  createCloudAccount,
} from '../../../../lib/cloud-auth'

async function registerOnCloud(body: Record<string, unknown>) {
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const nom_ecole = String(body.nom_ecole ?? '')
  const telephone = body.telephone ? String(body.telephone) : null
  const directeur_nom = String(body.directeur_nom ?? '')
  const sections = (body.sections as string[]) || ['francophone']
  const cle_licence = String(body.cle_licence ?? '').trim().toUpperCase()
  const code_parrain = body.code_parrain ? String(body.code_parrain).trim().toUpperCase() : null

  if (!email || !password || !nom_ecole || !directeur_nom || !cle_licence) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Mot de passe : 8 caractères minimum' }, { status: 400 })
  }

  if (await cloudEmailExists(email)) {
    return NextResponse.json({ error: 'Cet email est déjà enregistré' }, { status: 409 })
  }

  const verify = await verifyLicenceKey(cle_licence)
  if (!verify.valid) {
    return NextResponse.json({ error: verify.error || 'Clé de licence invalide' }, { status: 400 })
  }

  const finalSlug = await uniqueCloudSlug(nom_ecole)

  const activated = await activateLicenceOnCloud({
    cle: cle_licence,
    ecole_slug: finalSlug,
    ecole_nom: nom_ecole,
    directeur_nom,
    telephone,
    parrain_code: code_parrain,
    machine_fingerprint: null,
  })

  if (!activated.ok) {
    return NextResponse.json({ error: activated.error || 'Activation licence échouée' }, { status: 400 })
  }

  const recoveryCode = generateRecoveryCode()
  const recoveryHash = await hashRecoveryCode(recoveryCode)
  const passwordHash = await hashPassword(password)

  const created = await createCloudAccount({
    email,
    passwordHash,
    recoveryHash,
    ecole_slug: finalSlug,
    ecole_nom: nom_ecole,
    directeur_nom,
    telephone,
    sections,
  })

  if (!created.ok) {
    return NextResponse.json({ error: 'Erreur lors de la création du compte cloud' }, { status: 500 })
  }

  const { prepareSchoolDb, markSchoolDbDirty, flushSchoolDb } = await import('../../../../lib/school-db')
  await prepareSchoolDb(finalSlug)
  markSchoolDbDirty(finalSlug)
  await flushSchoolDb(finalSlug)

  const { getDb, resolveEcoleId } = await import('../../../../lib/db-server')
  const db = getDb()
  const ecoleId = resolveEcoleId(db, finalSlug, finalSlug)

  const token = await signToken({
    id: created.user_id,
    role: 'admin',
    ecole_id: ecoleId ?? finalSlug,
    ecole_slug: finalSlug,
    nom: directeur_nom,
    auth_source: 'cloud',
    account_id: created.account_id,
  })

  const response = NextResponse.json({
    success: true,
    slug: finalSlug,
    recovery_code: recoveryCode,
    user: { ecole_slug: finalSlug, role: 'admin', nom: directeur_nom },
    mode: 'cloud',
  })
  setAuthCookie(response, token)
  return response
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (process.env.VERCEL && isCloudAuthAvailable()) {
      return registerOnCloud(body)
    }

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

    const normalizedEmail = email.trim().toLowerCase()
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)
    if (existingEmail) {
      return NextResponse.json({ error: 'Cet email est déjà enregistré' }, { status: 409 })
    }

    if (isCloudAuthAvailable() && await cloudEmailExists(normalizedEmail)) {
      return NextResponse.json({ error: 'Cet email est déjà enregistré' }, { status: 409 })
    }

    const verifyRes = await fetch(
      `${LICENCE_SERVER_URL}/api/auth/verify-licence?cle=${encodeURIComponent(cle_licence.trim().toUpperCase())}`,
      {
        headers: { 'User-Agent': 'SchoolManager-Desktop/1.0' },
        signal: AbortSignal.timeout(8000),
      },
    )
    const verifyData = await verifyRes.json()

    if (!verifyData.valid) {
      return NextResponse.json({ error: verifyData.error || 'Clé de licence invalide' }, { status: 400 })
    }

    db.prepare(`
      INSERT INTO ecoles (nom, slug, telephone, directeur_nom, sections, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nom_ecole, finalSlug, telephone || null, directeur_nom, JSON.stringify(sections || ['francophone']), email)

    const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(finalSlug) as { id: string }

    const fingerprint = getMachineFingerprint()
    db.prepare(`
      INSERT OR IGNORE INTO licences (ecole_id, type, date_debut, date_fin, is_active, cle_licence, machine_fingerprint)
      VALUES (?, ?, date('now'), ?, 1, ?, ?)
    `).run(ecole.id, verifyData.plan, verifyData.date_fin, cle_licence.trim().toUpperCase(), fingerprint)

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
      new Date().toISOString(),
    )

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

    const { label: anneeLabel, date_debut, date_fin } = getDefaultAnneeScolaireBounds()

    db.prepare(`
      INSERT INTO annees_scolaires (ecole_id, label, date_debut, date_fin, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(ecole.id, anneeLabel, date_debut, date_fin)

    const recoveryCode = generateRecoveryCode()
    const recoveryHash = await hashRecoveryCode(recoveryCode)
    const passwordHash = await hashPassword(password)
    db.prepare(`
      INSERT INTO users (email, password_hash, nom, role, ecole_id, recovery_code_hash)
      VALUES (?, ?, ?, 'admin', ?, ?)
    `).run(normalizedEmail, passwordHash, directeur_nom, ecole.id, recoveryHash)

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail) as { id: string }

    if (isCloudAuthAvailable()) {
      const cloudCreated = await createCloudAccount({
        email: normalizedEmail,
        passwordHash,
        recoveryHash,
        ecole_slug: finalSlug,
        ecole_nom: nom_ecole,
        directeur_nom,
        telephone,
        sections,
      })
      if (cloudCreated.ok) {
        const { linkCloudUserLocalId } = await import('../../../../lib/cloud-auth')
        await linkCloudUserLocalId(cloudCreated.account_id, finalSlug, user.id)
      }
    }

    const token = await signToken({
      id: user.id,
      role: 'admin',
      ecole_id: ecole.id,
      ecole_slug: finalSlug,
      nom: directeur_nom,
      auth_source: 'local',
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
