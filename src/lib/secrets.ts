import 'server-only'
import crypto from 'crypto'
import fs from 'fs'
import { getMachineFingerprint, getSecretPath, ensureUserDataDir } from './paths'
import { runtimeEnv } from './runtime-env'

let cachedSecret: string | null = null

function safeMachineFingerprint(): string {
  try {
    return getMachineFingerprint()
  } catch {
    return `serverless-${process.env.VERCEL_REGION ?? 'default'}`
  }
}

export function getJwtSecret(): string {
  const envSecret = runtimeEnv('SM_JWT_SECRET')
  if (envSecret) {
    return envSecret
  }

  if (cachedSecret) {
    return cachedSecret
  }

  ensureUserDataDir()
  const secretPath = getSecretPath()

  try {
    if (fs.existsSync(secretPath)) {
      cachedSecret = fs.readFileSync(secretPath, 'utf8').trim()
      return cachedSecret
    }
  } catch {
    // ignore read errors on serverless
  }

  const machineHash = crypto
    .createHash('sha256')
    .update(safeMachineFingerprint())
    .digest('hex')

  const randomPart = crypto.randomBytes(32).toString('hex')
  cachedSecret = crypto
    .createHash('sha256')
    .update(`${machineHash}:${randomPart}`)
    .digest('hex')

  try {
    fs.writeFileSync(secretPath, cachedSecret, { mode: 0o600 })
  } catch {
    // secret kept in memory only (Vercel sans SM_JWT_SECRET)
  }
  return cachedSecret
}

export function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret())
}
