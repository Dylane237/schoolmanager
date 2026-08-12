import Database from 'better-sqlite3'

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
