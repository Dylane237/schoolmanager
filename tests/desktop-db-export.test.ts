import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import Database from 'better-sqlite3'
import { createMemoryDb } from '../src/lib/db'
import { exportMemoryDbToBuffer, tryLoadBufferIntoMemoryDb } from '../src/lib/db-vercel'

describe('export desktop db buffer', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-desktop-export-'))
    process.env.SM_USER_DATA = tmpDir
  })

  afterEach(() => {
    delete process.env.SM_USER_DATA
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('inclut les tranches_config après checkpoint WAL et lecture fichier', () => {
    const dbPath = path.join(tmpDir, 'schoolmanager.db')
    const db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.exec(`
      CREATE TABLE tranches_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ecole_id TEXT,
        classe_id TEXT,
        tranche_numero INTEGER,
        montant_attendu REAL,
        date_limite TEXT,
        annee_scolaire TEXT
      );
    `)
    db.prepare(`
      INSERT INTO tranches_config (ecole_id, classe_id, tranche_numero, montant_attendu, annee_scolaire)
      VALUES (?, ?, ?, ?, ?)
    `).run('e1', 'c1', 1, 50000, '2025-2026')

    db.pragma('wal_checkpoint(TRUNCATE)')
    db.close()

    const buffer = fs.readFileSync(dbPath)
    expect(buffer.length).toBeGreaterThan(0)

    const probe = new Database(dbPath, { readonly: true })
    const count = probe.prepare(
      'SELECT COUNT(*) as n FROM tranches_config WHERE classe_id = ? AND montant_attendu = ?',
    ).get('c1', 50000) as { n: number }
    probe.close()
    expect(count.n).toBe(1)
  })

  it('createMemoryDb export round-trip', () => {
    const db = createMemoryDb()
    db.prepare('INSERT INTO ecoles (id, nom, slug) VALUES (?, ?, ?)').run('e1', 'Test', 'test')
    const buffer = exportMemoryDbToBuffer(db)
    db.close()

    const loaded = tryLoadBufferIntoMemoryDb(buffer)
    expect(loaded).not.toBeNull()
    const row = loaded!.prepare('SELECT nom FROM ecoles WHERE slug = ?').get('test') as { nom: string }
    loaded!.close()
    expect(row.nom).toBe('Test')
  })
})
