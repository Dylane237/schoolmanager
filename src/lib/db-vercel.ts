import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

type SqliteDb = InstanceType<typeof Database>

/** Charge un fichier SQLite (buffer) dans une base :memory: (évite I/O WAL sur /tmp Vercel). */
export function loadBufferIntoMemoryDb(buffer: Buffer): SqliteDb {
  const mem = new Database(buffer.length > 0 ? buffer : ':memory:')
  mem.pragma('journal_mode = MEMORY')
  mem.pragma('foreign_keys = ON')
  return mem
}

/** Exporte une base :memory: vers un buffer (pour upload cloud). */
export function exportMemoryDbToBuffer(db: SqliteDb): Buffer {
  return db.serialize()
}

/**
 * Écrit un buffer cloud (serialize() Vercel ou fichier SQLite desktop) en .db utilisable sur disque.
 */
export async function materializeSqliteFileFromBuffer(buffer: Buffer, targetPath: string): Promise<void> {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })

  if (!buffer.length) {
    fs.writeFileSync(targetPath, buffer)
    return
  }

  const mem = loadBufferIntoMemoryDb(buffer)
  try {
    await mem.backup(targetPath)
  } finally {
    mem.close()
  }
}

export function isSqliteCorruptError(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'SQLITE_CORRUPT'
}

/** Vérifie qu'un fichier .db local est lisible. */
export function assertValidSqliteFile(dbPath: string): void {
  const probe = new Database(dbPath, { readonly: true })
  try {
    probe.pragma('quick_check')
  } finally {
    probe.close()
  }
}
