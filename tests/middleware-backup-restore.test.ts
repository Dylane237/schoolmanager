import { describe, expect, it } from 'vitest'

/** Miroir de la règle middleware pour /api/backup/restore (Electron localhost). */
function allowsLocalhostBackupRestore(pathname: string, host: string): boolean {
  return (
    pathname === '/api/backup/restore'
    && (host.startsWith('127.0.0.1') || host.startsWith('localhost'))
  )
}

describe('middleware localhost backup restore bypass', () => {
  it('allows restore on 127.0.0.1 without auth', () => {
    expect(allowsLocalhostBackupRestore('/api/backup/restore', '127.0.0.1:3000')).toBe(true)
  })

  it('allows restore on localhost without auth', () => {
    expect(allowsLocalhostBackupRestore('/api/backup/restore', 'localhost:3000')).toBe(true)
  })

  it('blocks restore on Vercel host', () => {
    expect(allowsLocalhostBackupRestore('/api/backup/restore', 'schoolmanager.vercel.app')).toBe(false)
  })

  it('does not bypass other API routes', () => {
    expect(allowsLocalhostBackupRestore('/api/backup', '127.0.0.1:3000')).toBe(false)
  })
})
