import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import {
  loadBufferIntoMemoryDb,
  exportMemoryDbToBuffer,
  tryLoadBufferIntoMemoryDb,
  isOnDiskSqliteFileBuffer,
} from '../src/lib/db-vercel'

describe('db-vercel buffer roundtrip', () => {
  it('loadBufferIntoMemoryDb + exportMemoryDbToBuffer preserves data', () => {
    const src = new Database(':memory:')
    src.pragma('foreign_keys = ON')
    src.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)')
    src.prepare('INSERT INTO t (name) VALUES (?)').run('hello')
    const exported = src.serialize()
    src.close()

    const loaded = loadBufferIntoMemoryDb(exported)
    const row = loaded.prepare('SELECT name FROM t WHERE id = 1').get() as { name: string }
    expect(row.name).toBe('hello')

    const roundtrip = exportMemoryDbToBuffer(loaded)
    loaded.close()

    const again = loadBufferIntoMemoryDb(roundtrip)
    const row2 = again.prepare('SELECT name FROM t WHERE id = 1').get() as { name: string }
    expect(row2.name).toBe('hello')
    again.close()
  })

  it('loadBufferIntoMemoryDb handles empty buffer', () => {
    const db = loadBufferIntoMemoryDb(Buffer.alloc(0))
    expect(db).toBeTruthy()
    db.exec('CREATE TABLE empty (id INTEGER PRIMARY KEY)')
    expect(exportMemoryDbToBuffer(db).length).toBeGreaterThan(0)
    db.close()
  })

  it('tryLoadBufferIntoMemoryDb returns null for corrupt buffer', () => {
    const garbage = Buffer.from('not a sqlite database at all')
    expect(tryLoadBufferIntoMemoryDb(garbage)).toBeNull()
  })

  it('tryLoadBufferIntoMemoryDb returns null for truncated on-disk header', () => {
    const truncated = Buffer.from('SQLite format 3\0').subarray(0, 8)
    expect(tryLoadBufferIntoMemoryDb(truncated)).toBeNull()
  })

  it('loadBufferIntoMemoryDb throws on corrupt buffer', () => {
    expect(() => loadBufferIntoMemoryDb(Buffer.from('garbage'))).toThrow(/Unable to open SQLite buffer/)
  })

  it('tryLoadBufferIntoMemoryDb opens on-disk SQLite file bytes', async () => {
    const fs = await import('fs')
    const os = await import('os')
    const path = await import('path')

    const src = new Database(':memory:')
    src.exec('CREATE TABLE disk (val TEXT)')
    src.prepare('INSERT INTO disk (val) VALUES (?)').run('from-file')
    src.close()

    const filePath = path.join(os.tmpdir(), `sm-ondisk-${Date.now()}.db`)
    const fileDb = new Database(filePath)
    fileDb.exec('CREATE TABLE disk (val TEXT)')
    fileDb.prepare('INSERT INTO disk (val) VALUES (?)').run('from-file')
    fileDb.close()

    const fileBytes = fs.readFileSync(filePath)
    expect(isOnDiskSqliteFileBuffer(fileBytes)).toBe(true)

    const mem = tryLoadBufferIntoMemoryDb(fileBytes)
    expect(mem).not.toBeNull()
    const row = mem!.prepare('SELECT val FROM disk').get() as { val: string }
    expect(row.val).toBe('from-file')
    mem!.close()
    fs.unlinkSync(filePath)
  })

  it('materializeSqliteFileFromBuffer converts serialize() to on-disk SQLite', async () => {
    const fs = await import('fs')
    const os = await import('os')
    const path = await import('path')
    const { materializeSqliteFileFromBuffer } = await import('../src/lib/db-vercel')

    const src = new Database(':memory:')
    src.exec('CREATE TABLE t (name TEXT)')
    src.prepare('INSERT INTO t (name) VALUES (?)').run('cloud')
    const serialized = src.serialize()
    src.close()

    const target = path.join(os.tmpdir(), `sm-test-${Date.now()}.db`)
    await materializeSqliteFileFromBuffer(serialized, target)

    const fileDb = new Database(target, { readonly: true })
    const row = fileDb.prepare('SELECT name FROM t').get() as { name: string }
    expect(row.name).toBe('cloud')
    fileDb.close()
    fs.unlinkSync(target)
  })
})
