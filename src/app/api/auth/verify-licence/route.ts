import { NextRequest, NextResponse } from 'next/server'

const LICENCE_SERVER_URL = 'https://schoolmanager-eosin.vercel.app'

function getDb() {
  if (process.env.VERCEL) return null

  try {
    const Database = require('better-sqlite3')
    const path = require('path')
    const userDataPath = process.env.SM_USER_DATA ||
      path.join(require('os').homedir(), 'Documents', 'SchoolManager')
    const dbPath = path.join(userDataPath, 'schoolmanager.db')
    const db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.exec(`
      CREATE TABLE IF NOT EXISTS licence_cache (
        cle TEXT PRIMARY KEY,
        plan TEXT NOT NULL,
        date_fin TEXT NOT NULL,
        last_verified TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      );
    `)
    return db
  } catch (e) {
    console.error('[verify] getDb error:', e)
    return null
  }
}

async function verifyOnVercel(cle: string) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: licence } = await supabase
      .from('licences')
      .select('cle_licence, type, date_fin, is_active, ecole_id')
      .eq('cle_licence', cle)
      .single()

    if (!licence) return NextResponse.json({ valid: false, error: 'Clé invalide' })
    if (!licence.is_active) return NextResponse.json({ valid: false, error: 'Licence révoquée' })
    if (licence.ecole_id) return NextResponse.json({ valid: false, error: 'Clé déjà utilisée' })

    const today = new Date().toISOString().split('T')[0]
    if (licence.date_fin < today) return NextResponse.json({ valid: false, error: 'Licence expirée' })

    return NextResponse.json({
      valid: true,
      plan: licence.type,
      date_fin: licence.date_fin,
      message: `Licence ${licence.type} valide jusqu'au ${licence.date_fin}`,
    })
  } catch (e) {
    console.error('[verify] supabase error:', e)
    return NextResponse.json({ valid: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cle = searchParams.get('cle')?.trim().toUpperCase()

  if (!cle) {
    return NextResponse.json({ valid: false, error: 'Clé requise' })
  }

  if (process.env.VERCEL) {
    return verifyOnVercel(cle)
  }

  // En local (Electron) : appel Vercel + cache SQLite
  const today = new Date().toISOString().split('T')[0]
  const db = getDb()

  try {
    const res = await fetch(
      `${LICENCE_SERVER_URL}/api/auth/verify-licence?cle=${encodeURIComponent(cle)}`,
      {
        headers: {
          'User-Agent': 'SchoolManager-Desktop/1.0',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      }
    )

    const data = await res.json()
    console.log('[verify] réponse Vercel:', JSON.stringify(data))

    if (data.valid) {
      if (db) {
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
        } catch (e) {
          console.error('[verify] cache save error:', e)
        }
      }

      return NextResponse.json({
        valid: true,
        plan: data.plan,
        date_fin: data.date_fin,
        message: data.message,
        source: 'online',
      })
    }

    return NextResponse.json({
      valid: false,
      error: data.error || 'Clé invalide',
      source: 'online',
    })

  } catch (err: any) {
    console.error('[verify] serveur inaccessible:', err?.message)
  }

  // Fallback cache offline
  if (db) {
    try {
      const cached = db.prepare('SELECT * FROM licence_cache WHERE cle = ?').get(cle) as any

      if (!cached) {
        return NextResponse.json({
          valid: false,
          error: 'Connexion internet requise pour la première activation',
          source: 'offline',
        })
      }

      if (!cached.is_active) {
        return NextResponse.json({ valid: false, error: 'Licence révoquée', source: 'offline' })
      }

      if (cached.date_fin < today) {
        return NextResponse.json({ valid: false, error: 'Licence expirée', source: 'offline' })
      }

      const daysSince = (Date.now() - new Date(cached.last_verified).getTime()) / 86400000
      if (daysSince > 30) {
        return NextResponse.json({
          valid: false,
          error: `Connexion requise (dernière vérif. il y a ${Math.floor(daysSince)} jours)`,
          source: 'offline',
        })
      }

      return NextResponse.json({
        valid: true,
        plan: cached.plan,
        date_fin: cached.date_fin,
        message: `Licence ${cached.plan} valide (mode offline)`,
        source: 'offline',
      })
    } catch (e) {
      console.error('[verify] cache read error:', e)
    }
  }

  return NextResponse.json({
    valid: false,
    error: 'Erreur de vérification — réessayez',
    source: 'error',
  })
}