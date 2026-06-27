import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../../lib/db-server'

const LICENCE_SERVER_URL = process.env.LICENCE_SERVER_URL || 'https://schoolmanager-eosin.vercel.app'
const OFFLINE_GRACE_DAYS = 30

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cle = searchParams.get('cle')?.trim().toUpperCase()

  if (!cle) {
    return NextResponse.json({ valid: false, error: 'Clé requise' }, { status: 400 })
  }

  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  // 1. Vérifier d'abord en local (offline-first)
  const localLicence = db.prepare(`
    SELECT l.*, e.nom as ecole_nom, e.slug as ecole_slug
    FROM licences l
    LEFT JOIN ecoles e ON e.id = l.ecole_id
    WHERE l.cle_licence = ? AND l.is_active = 1 AND l.date_fin >= ?
  `).get(cle, today) as any

  if (localLicence) {
    // Licence valide en local — essayer de sync en arrière-plan
    syncWithServer(cle, db).catch(() => {})

    return NextResponse.json({
      valid: true,
      plan: localLicence.type,
      date_fin: localLicence.date_fin,
      ecole_id: localLicence.ecole_id,
      message: `Licence ${localLicence.type} valide jusqu'au ${localLicence.date_fin}`,
      source: 'local'
    })
  }

  // 2. Pas en local — essayer le serveur central
  try {
    const res = await fetch(
      `${LICENCE_SERVER_URL}/api/licences/verify?cle=${encodeURIComponent(cle)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const data = await res.json()

    if (data.valid) {
      // Mettre en cache local
      upsertLicenceCache(db, cle, data)
      return NextResponse.json({ ...data, source: 'online' })
    }

    return NextResponse.json({ valid: false, error: data.error, source: 'online' })

  } catch (err) {
    console.error('[verify-licence] Serveur inaccessible:', err)
  }

  // 3. Vérifier le cache offline
  const cached = db.prepare(`
    SELECT * FROM licence_cache WHERE cle = ?
  `).get(cle) as any

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
}

async function syncWithServer(cle: string, db: any) {
  const LICENCE_SERVER_URL = process.env.LICENCE_SERVER_URL || 'https://schoolmanager-eosin.vercel.app'
  try {
    const res = await fetch(
      `${LICENCE_SERVER_URL}/api/licences/verify?cle=${encodeURIComponent(cle)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    if (data.valid) {
      upsertLicenceCache(db, cle, data)
    } else {
      // Révoquer localement si révoqué sur le serveur
      db.prepare('UPDATE licences SET is_active = 0 WHERE cle_licence = ?').run(cle)
    }
  } catch { /* offline — pas grave */ }
}

function upsertLicenceCache(db: any, cle: string, data: any) {
  try {
    db.prepare(`
      INSERT INTO licence_cache (cle, plan, date_fin, last_verified, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(cle) DO UPDATE SET
        plan = excluded.plan,
        date_fin = excluded.date_fin,
        last_verified = excluded.last_verified,
        is_active = 1
    `).run(cle, data.plan, data.date_fin, new Date().toISOString())
  } catch { /* table peut ne pas exister */ }
}