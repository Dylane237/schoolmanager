import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../../lib/db-server'

const LICENCE_SERVER_URL = 'https://schoolmanager-eosin.vercel.app'
const OFFLINE_GRACE_DAYS = 30

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cle = searchParams.get('cle')?.trim().toUpperCase()

  if (!cle) {
    return NextResponse.json({ valid: false, error: 'Clé requise' })
  }

  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  // 1. Vérification locale SQLite
  try {
    const localLicence = db.prepare(`
      SELECT l.*, e.slug as ecole_slug
      FROM licences l
      LEFT JOIN ecoles e ON e.id = l.ecole_id
      WHERE l.cle_licence = ? AND l.is_active = 1 AND l.date_fin >= ?
    `).get(cle, today) as any

    if (localLicence) {
      return NextResponse.json({
        valid: true,
        plan: localLicence.type,
        date_fin: localLicence.date_fin,
        message: `Licence ${localLicence.type} valide jusqu'au ${localLicence.date_fin}`,
        source: 'local'
      })
    }
  } catch (e) {
    console.error('[verify] SQLite error:', e)
  }

  // 2. Vérification serveur Vercel
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(
      `${LICENCE_SERVER_URL}/api/licences/verify?cle=${encodeURIComponent(cle)}`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)

    const text = await res.text()
    console.log('[verify] Vercel response:', text.slice(0, 200))

    const data = JSON.parse(text)

    if (data.valid) {
      // Sauvegarder en cache local
      try {
        const db2 = getDb()
        db2.prepare(`
          INSERT INTO licence_cache (cle, plan, date_fin, last_verified, is_active)
          VALUES (?, ?, ?, ?, 1)
          ON CONFLICT(cle) DO UPDATE SET
            plan = excluded.plan,
            date_fin = excluded.date_fin,
            last_verified = excluded.last_verified,
            is_active = 1
        `).run(cle, data.plan, data.date_fin, new Date().toISOString())
      } catch (e) {
        console.error('[verify] Cache save error:', e)
      }

      return NextResponse.json({
        valid: true,
        plan: data.plan,
        date_fin: data.date_fin,
        message: data.message,
        source: 'online'
      })
    }

    return NextResponse.json({
      valid: false,
      error: data.error || 'Clé invalide',
      source: 'online'
    })

  } catch (err: any) {
    console.error('[verify] Serveur inaccessible:', err?.message || err)
  }

  // 3. Cache offline
  try {
    const cached = getDb().prepare(
      'SELECT * FROM licence_cache WHERE cle = ?'
    ).get(cle) as any

    if (!cached) {
      return NextResponse.json({
        valid: false,
        error: 'Connexion internet requise pour la première activation',
        source: 'offline'
      })
    }

    if (!cached.is_active) {
      return NextResponse.json({ valid: false, error: 'Licence révoquée', source: 'offline' })
    }

    if (cached.date_fin < today) {
      return NextResponse.json({ valid: false, error: 'Licence expirée', source: 'offline' })
    }

    const daysSince = (Date.now() - new Date(cached.last_verified).getTime()) / 86400000
    if (daysSince > OFFLINE_GRACE_DAYS) {
      return NextResponse.json({
        valid: false,
        error: `Connexion requise (dernière vérif. il y a ${Math.floor(daysSince)} jours)`,
        source: 'offline'
      })
    }

    return NextResponse.json({
      valid: true,
      plan: cached.plan,
      date_fin: cached.date_fin,
      message: `Licence ${cached.plan} valide (mode offline)`,
      source: 'offline'
    })
  } catch (e) {
    console.error('[verify] Cache error:', e)
    return NextResponse.json({
      valid: false,
      error: 'Erreur de vérification',
      source: 'error'
    })
  }
}