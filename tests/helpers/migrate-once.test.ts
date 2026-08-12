import { describe, it } from 'vitest'
import { getDb } from '@/lib/db'

describe('db migrate once', () => {
  it.skipIf(Boolean(process.env.VERCEL))('applies schema and versioned migrations', () => {
    const db = getDb()
    const rows = db.prepare('SELECT version, name FROM schema_migrations ORDER BY version').all() as {
      version: number
      name: string
    }[]
    console.log('schema_migrations:', rows.map(r => `${r.version}:${r.name}`).join(', ') || '(aucune)')
  })
})
