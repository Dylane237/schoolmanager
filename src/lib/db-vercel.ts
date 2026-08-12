import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'

type SqliteDb = InstanceType<typeof Database>

const SQLITE_FILE_HEADER = Buffer.from('SQLite format 3\0')

function configureMemoryDbPragmas(db: SqliteDb): void {
  db.pragma('journal_mode = MEMORY')
  db.pragma('foreign_keys = ON')
}

export function isOnDiskSqliteFileBuffer(buffer: Buffer): boolean {
  return buffer.length >= 16 && buffer.subarray(0, 16).equals(SQLITE_FILE_HEADER)
}

export function isSqliteOpenError(err: unknown): boolean {
  if (!err || typeof err !== 'object' || !('code' in err)) return false
  const code = (err as { code: string }).code
  return code === 'SQLITE_CANTOPEN' || code === 'SQLITE_NOTADB' || code === 'SQLITE_CORRUPT'
}

export function isSqliteCorruptError(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'SQLITE_CORRUPT'
}

function loadOnDiskBufferViaTemp(buffer: Buffer): SqliteDb | null {
  const tmpPath = path.join(
    os.tmpdir(),
    `sm-blob-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
  )
  let fileDb: SqliteDb | null = null
  try {
    fs.writeFileSync(tmpPath, buffer)
    fileDb = new Database(tmpPath, { readonly: true })
    const check = fileDb.pragma('quick_check', { simple: true }) as string
    if (check !== 'ok') return null
    const serialized = fileDb.serialize()
    fileDb.close()
    fileDb = null
    return loadSerializedBuffer(serialized)
  } catch {
    return null
  } finally {
    if (fileDb) {
      try { fileDb.close() } catch { /* ignore */ }
    }
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
    } catch {
      /* ignore */
    }
  }
}

function loadSerializedBuffer(buffer: Buffer): SqliteDb | null {
  let db: SqliteDb | null = null
  try {
    db = new Database(buffer)
    configureMemoryDbPragmas(db)
    const check = db.pragma('quick_check', { simple: true }) as string
    if (check !== 'ok') {
      db.close()
      return null
    }
    db.prepare('SELECT 1').get()
    return db
  } catch {
    if (db) {
      try { db.close() } catch { /* ignore */ }
    }
    return null
  }
}

/**
 * Ouvre un buffer SQLite en :memory: sans lever d'exception.
 * Gère serialize() better-sqlite3 et fichiers .db on-disk (via fichier temp).
 */
export function tryLoadBufferIntoMemoryDb(buffer: Buffer): SqliteDb | null {
  if (!buffer.length) return null

  if (isOnDiskSqliteFileBuffer(buffer)) {
    return loadOnDiskBufferViaTemp(buffer)
  }

  return loadSerializedBuffer(buffer)
}

/** Charge un buffer SQLite en :memory: — lève si le buffer est illisible. */
export function loadBufferIntoMemoryDb(buffer: Buffer): SqliteDb {
  if (!buffer.length) {
    const mem = new Database(':memory:')
    configureMemoryDbPragmas(mem)
    return mem
  }

  const db = tryLoadBufferIntoMemoryDb(buffer)
  if (!db) {
    throw new Error('Unable to open SQLite buffer (invalid, corrupt, or unsupported format)')
  }
  return db
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

  const mem = tryLoadBufferIntoMemoryDb(buffer)
  if (!mem) {
    throw new Error('Unable to materialize SQLite file from buffer')
  }
  try {
    await mem.backup(targetPath)
  } finally {
    mem.close()
  }
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
