import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { loadBufferIntoMemoryDb, exportMemoryDbToBuffer } from '../src/lib/db-vercel'

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
