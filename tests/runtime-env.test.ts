import { describe, expect, it, beforeEach, afterEach } from 'vitest'

describe('isServerlessRuntime', () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of ['VERCEL', 'VERCEL_ENV', 'AWS_LAMBDA_FUNCTION_NAME', 'AWS_EXECUTION_ENV']) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const [key, val] of Object.entries(saved)) {
      if (val === undefined) delete process.env[key]
      else process.env[key] = val
    }
  })

  it('détecte VERCEL=1 (statique build Vercel)', async () => {
    process.env.VERCEL = '1'
    const { isServerlessRuntime } = await import('../src/lib/runtime-env')
    expect(isServerlessRuntime()).toBe(true)
  })

  it('détecte VERCEL_ENV=production via runtimeEnv', async () => {
    process.env.VERCEL_ENV = 'production'
    const { isServerlessRuntime } = await import('../src/lib/runtime-env')
    expect(isServerlessRuntime()).toBe(true)
  })

  it('retourne false hors serverless', async () => {
    const { isServerlessRuntime } = await import('../src/lib/runtime-env')
    expect(isServerlessRuntime()).toBe(false)
  })
})

describe('getDb avec slug en mémoire', () => {
  it('retourne la base _dbsBySlug sans ouvrir de fichier', async () => {
    const { openVercelSchoolDb, getDb, closeDbForSlug } = await import('../src/lib/db')

    await openVercelSchoolDb('test-slug-mem', {
      provision: async (db) => {
        db.exec('CREATE TABLE IF NOT EXISTS ecoles (id TEXT, slug TEXT)')
      },
    })

    const db = getDb('test-slug-mem')
    expect(db).toBeTruthy()
    db.prepare('INSERT INTO ecoles (id, slug) VALUES (?, ?)').run('1', 'test-slug-mem')
    expect(getDb('test-slug-mem')).toBe(db)

    closeDbForSlug('test-slug-mem')
  })
})
