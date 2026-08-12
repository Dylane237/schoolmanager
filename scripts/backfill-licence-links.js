/**
 * Lie les licences Supabase aux écoles à partir des blobs cloud (one-shot / maintenance).
 * Usage: node scripts/backfill-licence-links.js
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const Database = require('better-sqlite3')
const fs = require('fs')
const os = require('os')
const path = require('path')

const HEADER = Buffer.from('SQLite format 3\0')

function tryLoad(buffer) {
  if (!buffer.length) return null
  if (buffer.subarray(0, 16).equals(HEADER)) {
    try {
      const db = new Database(buffer)
      if (db.pragma('quick_check', { simple: true }) !== 'ok') {
        db.close()
        return null
      }
      return db
    } catch {
      const tmp = path.join(os.tmpdir(), `bf-${Date.now()}.db`)
      try {
        fs.writeFileSync(tmp, buffer)
        const db = new Database(tmp, { readonly: true })
        if (db.pragma('quick_check', { simple: true }) !== 'ok') {
          db.close()
          return null
        }
        return db
      } catch {
        return null
      } finally {
        try {
          fs.unlinkSync(tmp)
        } catch {
          /* ignore */
        }
      }
    }
  }
  try {
    const db = new Database(buffer)
    if (db.pragma('quick_check', { simple: true }) !== 'ok') {
      db.close()
      return null
    }
    return db
  } catch {
    return null
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

;(async () => {
  const { data: schools, error } = await sb.from('ecoles').select('slug, id, nom')
  if (error) {
    console.error('ecoles:', error.message)
    process.exit(1)
  }

  let linked = 0
  let skipped = 0
  let failed = 0

  for (const school of schools ?? []) {
    const slug = school.slug
    const { data: blob, error: dlErr } = await sb.storage
      .from('school-databases')
      .download(`${slug}/schoolmanager.db`)

    if (dlErr || !blob) {
      skipped++
      continue
    }

    const buf = Buffer.from(await blob.arrayBuffer())
    const db = tryLoad(buf)
    if (!db) {
      failed++
      console.log(`[skip] blob illisible: ${slug}`)
      continue
    }

    const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(slug)
    const lic = ecole
      ? db.prepare(`
          SELECT cle_licence FROM licences
          WHERE ecole_id = ? AND is_active = 1 AND date_fin >= date('now')
          ORDER BY date_fin DESC LIMIT 1
        `).get(ecole.id)
      : null
    db.close()

    if (!lic?.cle_licence) {
      skipped++
      continue
    }

    const cle = String(lic.cle_licence).trim().toUpperCase()
    const { data: licenceRow } = await sb
      .from('licences')
      .select('id, ecole_slug, ecole_id')
      .eq('cle_licence', cle)
      .maybeSingle()

    if (!licenceRow?.id) {
      failed++
      console.log(`[skip] cle Supabase introuvable pour ${slug}`)
      continue
    }

    if (licenceRow.ecole_slug === slug && licenceRow.ecole_id === school.id) {
      skipped++
      continue
    }

    const { error: upErr } = await sb
      .from('licences')
      .update({
        ecole_id: school.id,
        ecole_slug: slug,
        ecole_nom: school.nom,
        activated_at: new Date().toISOString(),
      })
      .eq('id', licenceRow.id)

    if (upErr) {
      failed++
      console.log(`[fail] ${slug}: ${upErr.message}`)
    } else {
      linked++
      console.log(`[ok] ${slug}`)
    }
  }

  console.log(JSON.stringify({ linked, skipped, failed, total: schools?.length ?? 0 }))
})()
