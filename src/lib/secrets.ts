import 'server-only'
import crypto from 'crypto'
import fs from 'fs'
import { getMachineFingerprint, getSecretPath, ensureUserDataDir } from './paths'

let cachedSecret: string | null = null

export function getJwtSecret(): string {
  if (process.env.SM_JWT_SECRET) {
    return process.env.SM_JWT_SECRET
  }

  if (cachedSecret) {
    return cachedSecret
  }

  ensureUserDataDir()
  const secretPath = getSecretPath()

  if (fs.existsSync(secretPath)) {
    cachedSecret = fs.readFileSync(secretPath, 'utf8').trim()
    return cachedSecret
  }

  const machineHash = crypto
    .createHash('sha256')
    .update(getMachineFingerprint())
    .digest('hex')

  const randomPart = crypto.randomBytes(32).toString('hex')
  cachedSecret = crypto
    .createHash('sha256')
    .update(`${machineHash}:${randomPart}`)
    .digest('hex')

  fs.writeFileSync(secretPath, cachedSecret, { mode: 0o600 })
  return cachedSecret
}

export function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret())
}
