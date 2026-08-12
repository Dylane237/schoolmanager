import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'

type SqliteDb = InstanceType<typeof Database>
type BackupTarget = string | SqliteDb

function removeTempDbFiles(basePath: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(basePath + suffix) } catch { /* ignore */ }
  }
}

function backupTo(dest: BackupTarget, source: SqliteDb): void {
  ;(source.backup as (target: BackupTarget) => void)(dest)
}

/** Charge un fichier SQLite (buffer) dans une base :memory: (évite I/O WAL sur /tmp Vercel). */
export function loadBufferIntoMemoryDb(buffer: Buffer): SqliteDb {
  const mem = new Database(':memory:')
  mem.pragma('journal_mode = MEMORY')
  mem.pragma('foreign_keys = ON')

  if (!buffer.length) return mem

  const tmpFile = path.join(os.tmpdir(), `sm-load-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
  try {
    fs.writeFileSync(tmpFile, buffer)
    const src = new Database(tmpFile, { readonly: true, fileMustExist: true })
    src.pragma('journal_mode = DELETE')
    backupTo(mem, src)
    src.close()
  } finally {
    removeTempDbFiles(tmpFile)
  }

  return mem
}

/** Exporte une base :memory: vers un buffer (pour upload cloud). */
export function exportMemoryDbToBuffer(db: SqliteDb): Buffer {
  const tmpFile = path.join(os.tmpdir(), `sm-export-${Date.now()}.db`)
  try {
    const fileDb = new Database(tmpFile)
    fileDb.pragma('journal_mode = DELETE')
    backupTo(fileDb, db)
    fileDb.close()
    return fs.readFileSync(tmpFile)
  } finally {
    removeTempDbFiles(tmpFile)
  }
}
