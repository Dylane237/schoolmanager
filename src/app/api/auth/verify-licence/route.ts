import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../../lib/db-server'

// URL de ton serveur de licences (à adapter)
const LICENCE_SERVER_URL = process.env.LICENCE_SERVER_URL || 'https://ton-serveur.com'

// Durée de validité du cache offline en jours
const OFFLINE_GRACE_DAYS = 30

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cle = searchParams.get('cle')?.trim().toUpperCase()

  if (!cle) {
    return NextResponse.json({ valid: false, error: 'Clé requise' }, { status: 400 })
  }

  const db = getDb()

  // ── Vérification online ──────────────────────────────────────────────────────
  try {
    const res = await fetch(
      `${LICENCE_SERVER_URL}/api/auth/verify-licence?cle=${encodeURIComponent(cle)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const data = await res.json()

    if (data.valid) {
      // Stocker/mettre à jour le cache local
      const now = new Date().toISOString()
      db.prepare(`
        INSERT INTO licence_cache (cle, plan, date_fin, last_verified, is_active)
        VALUES (@cle, @plan, @date_fin, @last_verified, 1)
        ON CONFLICT(cle) DO UPDATE SET
          plan = @plan,
          date_fin = @date_fin,
          last_verified = @last_verified,
          is_active = 1
      `).run({
        cle,
        plan: data.plan,
        date_fin: data.date_fin,
        last_verified: now,
      })

      return NextResponse.json({
        valid: true,
        plan: data.plan,
        date_fin: data.date_fin,
        message: data.message,
        source: 'online',
      })
    }

    // Licence invalide selon le serveur (révoquée, expirée, déjà utilisée...)
    // On invalide aussi le cache local
    db.prepare(`
      UPDATE licence_cache SET is_active = 0 WHERE cle = ?
    `).run(cle)

    return NextResponse.json({ valid: false, error: data.error, source: 'online' })

  } catch {
    // Pas de connexion → fallback offline
    console.log('[verify-licence] Serveur inaccessible, vérification offline...')
  }

  // ── Fallback offline ─────────────────────────────────────────────────────────
  const cached = db.prepare(`
    SELECT cle, plan, date_fin, last_verified, is_active
    FROM licence_cache WHERE cle = ?
  `).get(cle) as {
    cle: string
    plan: string
    date_fin: string
    last_verified: string
    is_active: number
  } | undefined

  if (!cached) {
    return NextResponse.json({
      valid: false,
      error: 'Connexion internet requise pour la première activation',
      source: 'offline',
    })
  }

  if (!cached.is_active) {
    return NextResponse.json({
      valid: false,
      error: 'Cette licence a été révoquée',
      source: 'offline',
    })
  }

  // Vérifier expiration
  const today = new Date().toISOString().split('T')[0]
  if (cached.date_fin < today) {
    return NextResponse.json({
      valid: false,
      error: 'Licence expirée',
      source: 'offline',
    })
  }

  // Vérifier la grâce offline (si dernière vérif > OFFLINE_GRACE_DAYS jours)
  const lastVerified = new Date(cached.last_verified)
  const daysSinceVerif = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceVerif > OFFLINE_GRACE_DAYS) {
    return NextResponse.json({
      valid: false,
      error: `Connexion internet requise (dernière vérification il y a ${Math.floor(daysSinceVerif)} jours)`,
      source: 'offline',
    })
  }

  return NextResponse.json({
    valid: true,
    plan: cached.plan,
    date_fin: cached.date_fin,
    message: `Licence ${cached.plan} valide jusqu'au ${cached.date_fin} (mode offline)`,
    source: 'offline',
  })
}