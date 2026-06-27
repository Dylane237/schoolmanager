import { NextRequest, NextResponse } from 'next/server'

const LICENCE_SERVER_URL = 'https://schoolmanager-eosin.vercel.app'

function getDb() {
  try {
    const Database = require('better-sqlite3')
    const path = require('path')
    const fs = require('fs')
    
    const userDataPath = process.env.SM_USER_DATA || 
      path.join(require('os').homedir(), 'Documents', 'SchoolManager')
    
    const dbPath = path.join(userDataPath, 'schoolmanager.db')
    
    const db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    
    // Créer table cache si elle n'existe pas
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cle = searchParams.get('cle')?.trim().toUpperCase()

  if (!cle) {
    return NextResponse.json({ valid: false, error: 'Clé requise' })
  }

  const today = new Date().toISOString().split('T')[0]
  const db = getDb()  //

  // 2. Vérification serveur Vercel
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(
      `${LICENCE_SERVER_URL}/api/licences/verify?cle=${encodeURIComponent(cle)}`,
      { signal: controller.signal,
    headers: {
      'User-Agent': 'SchoolManager-Desktop/1.0',
      'Accept': 'application/json',
      }
      }
    )
    clearTimeout(timeout)

    const text = await res.text()
    const data = JSON.parse(text)

    if (data.valid && db) {
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
    console.error('[verify] serveur inaccessible:', err?.message)
  }

  // 3. Cache offline
  if (db) {
    try {
      const cached = db.prepare('SELECT * FROM licence_cache WHERE cle = ?').get(cle) as any

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
      if (daysSince > 30) {
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
      console.error('[verify] cache read error:', e)
    }
  }

  return NextResponse.json({
    valid: false,
    error: 'Erreur de vérification — réessayez',
    source: 'error'
  })
}
