import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db-server'
import { requireModule } from '@/lib/rbac.server'
import { getMachineFingerprint } from '@/lib/paths'
import { LICENCE_SERVER_URL } from '@/lib/licence-server'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'parametres', 'POST')
  if (denied) return denied

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Seul le directeur peut renouveler la licence' }, { status: 403 })
  }

  const body = await request.json()
  const cle = body.cle?.trim().toUpperCase()
  if (!cle) {
    return NextResponse.json({ error: 'Clé de licence requise' }, { status: 400 })
  }

  const db = getDb()
  const ecole = db.prepare('SELECT id, slug, nom FROM ecoles WHERE id = ?').get(user.ecole_id) as {
    id: string
    slug: string
    nom: string
  } | undefined

  if (!ecole) {
    return NextResponse.json({ error: 'École introuvable' }, { status: 404 })
  }

  const existing = db.prepare(`
    SELECT cle_licence FROM licences
    WHERE ecole_id = ? AND is_active = 1 AND date_fin >= date('now')
    LIMIT 1
  `).get(ecole.id) as { cle_licence: string } | undefined

  if (existing?.cle_licence === cle) {
    return NextResponse.json({ error: 'Cette clé est déjà active pour votre établissement' }, { status: 400 })
  }

  // Vérification via l'endpoint existant (logique en ligne inchangée)
  const verifyRes = await fetch(
    `${LICENCE_SERVER_URL}/api/auth/verify-licence?cle=${encodeURIComponent(cle)}`,
    {
      headers: { 'User-Agent': 'SchoolManager-Desktop/1.0' },
      signal: AbortSignal.timeout(8000),
    }
  )
  const verifyData = await verifyRes.json()

  if (!verifyData.valid) {
    return NextResponse.json(
      { error: verifyData.error || 'Clé de licence invalide' },
      { status: 400 }
    )
  }

  const fingerprint = getMachineFingerprint()

  db.prepare(`
    UPDATE licences SET is_active = 0 WHERE ecole_id = ? AND is_active = 1
  `).run(ecole.id)

  db.prepare(`
    INSERT INTO licences (ecole_id, type, date_debut, date_fin, is_active, cle_licence, machine_fingerprint)
    VALUES (?, ?, date('now'), ?, 1, ?, ?)
  `).run(ecole.id, verifyData.plan, verifyData.date_fin, cle, fingerprint)

  db.prepare(`
    INSERT INTO licence_cache (cle, plan, date_fin, last_verified, is_active)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(cle) DO UPDATE SET
      plan = excluded.plan,
      date_fin = excluded.date_fin,
      last_verified = excluded.last_verified,
      is_active = 1
  `).run(cle, verifyData.plan, verifyData.date_fin, new Date().toISOString())

  try {
    await fetch(`${LICENCE_SERVER_URL}/api/auth/use-licence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SchoolManager-Desktop/1.0',
      },
      body: JSON.stringify({
        cle,
        ecole_slug: ecole.slug,
        ecole_nom: ecole.nom,
        machine_fingerprint: fingerprint,
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (e) {
    console.warn('[licence/renew] use-licence failed (non bloquant):', e)
  }

  return NextResponse.json({
    success: true,
    plan: verifyData.plan,
    dateFin: verifyData.date_fin,
    message: verifyData.message,
  })
}
