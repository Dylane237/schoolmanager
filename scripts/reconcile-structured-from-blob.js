/**
 * Réaligne cloud_eleves / cloud_classes / cloud_sync_meta depuis les blobs SQLite.
 * Usage: node scripts/reconcile-structured-from-blob.js
 */
require('dotenv').config({ path: '.env.local' })

const Module = require('module')
const originalRequire = Module.prototype.require
Module.prototype.require = function (id) {
  if (id === 'server-only') return {}
  return originalRequire.apply(this, arguments)
}

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
      const tmp = path.join(os.tmpdir(), `reconcile-${Date.now()}.db`)
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

async function upsertStructured(slug, payload) {
  const now = new Date().toISOString()
  const CHUNK = 400
  const chunk = (arr, size) => {
    const out = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }

  await sb.from('cloud_classes').delete().eq('ecole_slug', slug)
  await sb.from('cloud_eleves').delete().eq('ecole_slug', slug)
  await sb.from('cloud_payment_summaries').delete().eq('ecole_slug', slug)

  const classRows = payload.classes.map(c => ({
    ecole_slug: slug,
    local_id: c.local_id,
    nom: c.nom,
    section: c.section,
    niveau: c.niveau,
    annee_scolaire: c.annee_scolaire,
    capacite_max: c.capacite_max,
    nb_eleves: c.nb_eleves,
    enseignant_nom: c.enseignant_nom,
    synced_at: now,
  }))

  for (const batch of chunk(classRows, CHUNK)) {
    const { error } = await sb.from('cloud_classes').insert(batch)
    if (error) throw new Error(error.message)
  }

  const eleveRows = payload.eleves.map(e => ({
    ecole_slug: slug,
    local_id: e.local_id,
    numero_matricule: e.numero_matricule,
    nom: e.nom,
    prenom: e.prenom,
    sexe: e.sexe,
    section: e.section,
    statut: e.statut,
    classe_local_id: e.classe_local_id,
    classe_nom: e.classe_nom,
    date_naissance: e.date_naissance,
    parent_nom: e.parent_nom,
    parent_telephone: e.parent_telephone,
    total_paye: e.total_paye,
    total_attendu: e.total_attendu,
    synced_at: now,
  }))

  for (const batch of chunk(eleveRows, CHUNK)) {
    const { error } = await sb.from('cloud_eleves').insert(batch)
    if (error) throw new Error(error.message)
  }

  const elevesActif = payload.eleves.filter(e => e.statut === 'actif').length
  const { error: metaErr } = await sb.from('cloud_sync_meta').upsert(
    {
      ecole_slug: slug,
      annee_scolaire: payload.annee_scolaire,
      synced_at: now,
      eleves_count: elevesActif,
      classes_count: payload.classes.length,
      dashboard_stats: {
        ...payload.dashboard_stats,
        eleves_total: payload.eleves.length,
        eleves_actif: elevesActif,
      },
    },
    { onConflict: 'ecole_slug' },
  )
  if (metaErr) throw new Error(metaErr.message)

  return { eleves: payload.eleves.length, classes: payload.classes.length, eleves_actif: elevesActif }
}

;(async () => {
  const { buildSchoolSyncPayload } = await import('../src/lib/sync-payload.ts')

  const { data: snapshots, error } = await sb.from('cloud_db_snapshots').select('ecole_slug')
  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  let ok = 0
  let skipped = 0
  let failed = 0

  for (const row of snapshots ?? []) {
    const slug = row.ecole_slug
    const { data: blob, error: dlErr } = await sb.storage
      .from('school-databases')
      .download(`${slug}/schoolmanager.db`)

    if (dlErr || !blob) {
      skipped++
      console.log(`[skip] ${slug}: blob absent`)
      continue
    }

    const buf = Buffer.from(await blob.arrayBuffer())
    const db = tryLoad(buf)
    if (!db) {
      failed++
      console.log(`[fail] ${slug}: blob illisible`)
      continue
    }

    const ecole = db.prepare('SELECT id, nom FROM ecoles WHERE slug = ?').get(slug)
    const licence = ecole
      ? db.prepare(`
          SELECT cle_licence FROM licences
          WHERE ecole_id = ? AND is_active = 1
          ORDER BY date_fin DESC LIMIT 1
        `).get(ecole.id)
      : null

    if (!ecole || !licence?.cle_licence) {
      db.close()
      skipped++
      console.log(`[skip] ${slug}: école ou licence absente du blob`)
      continue
    }

    try {
      const payload = buildSchoolSyncPayload(
        db,
        ecole.id,
        slug,
        ecole.nom,
        licence.cle_licence,
        'reconcile-script',
      )
      db.close()

      if (payload.eleves.length === 0) {
        const { count } = await sb
          .from('cloud_eleves')
          .select('*', { count: 'exact', head: true })
          .eq('ecole_slug', slug)
        if ((count ?? 0) > 0) {
          skipped++
          console.log(`[skip] ${slug}: blob vide — cloud a déjà ${count} élèves (restaurer depuis desktop)`)
          continue
        }
      }

      const counts = await upsertStructured(slug, payload)
      ok++
      console.log(`[ok] ${slug}: ${counts.eleves} élèves (${counts.eleves_actif} actifs), ${counts.classes} classes`)
    } catch (err) {
      db.close()
      failed++
      console.log(`[fail] ${slug}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(JSON.stringify({ ok, skipped, failed, total: snapshots?.length ?? 0 }))
})()
