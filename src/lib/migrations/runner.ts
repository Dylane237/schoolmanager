import fs from 'fs'
import path from 'path'
import type Database from 'better-sqlite3'

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations')

/** Applique les migrations SQL versionnées (001_xxx.sql, 002_xxx.sql, …). */
export function runVersionedMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `)

  if (!fs.existsSync(MIGRATIONS_DIR)) return

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d{3}_.+\.sql$/.test(f))
    .sort()

  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[])
      .map(r => r.version),
  )

  for (const file of files) {
    const version = parseInt(file.slice(0, 3), 10)
    if (applied.has(version)) continue

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    db.exec(sql)
    db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(version, file)
  }
}
