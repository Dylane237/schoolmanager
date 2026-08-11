import 'server-only'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRecoveryCode(): string {
  const part = () =>
    Array.from({ length: 4 }, () => CHARSET[crypto.randomInt(CHARSET.length)]).join('')
  return `SM-${part()}-${part()}`
}

export async function hashRecoveryCode(code: string): Promise<string> {
  return bcrypt.hash(code.replace(/\s/g, '').toUpperCase(), 12)
}

export async function verifyRecoveryCode(code: string, hash: string | null): Promise<boolean> {
  if (!hash) return false
  return bcrypt.compare(code.replace(/\s/g, '').toUpperCase(), hash)
}

export function normalizeRecoveryCode(code: string): string {
  return code.replace(/\s/g, '').toUpperCase()
}
