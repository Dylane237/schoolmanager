import 'server-only'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { ensureUserDataDir } from './paths'

const DEFAULT_EMAIL = 'admin@schoolmanager.cm'
const CREDENTIALS_FILENAME = '.super-admin-credentials.json'

interface SuperAdminCredentialsFile {
  email: string
  password: string
  createdAt: string
}

function getCredentialsPath(): string {
  return path.join(ensureUserDataDir(), CREDENTIALS_FILENAME)
}

function readCredentialsFile(): SuperAdminCredentialsFile | null {
  const credPath = getCredentialsPath()
  if (!fs.existsSync(credPath)) return null
  try {
    return JSON.parse(fs.readFileSync(credPath, 'utf8')) as SuperAdminCredentialsFile
  } catch {
    return null
  }
}

export function getSuperAdminEmail(): string {
  return (
    process.env.SM_SUPER_ADMIN_EMAIL ||
    process.env.SUPER_ADMIN_EMAIL ||
    DEFAULT_EMAIL
  )
}

/** Mot de passe super-admin : env > fichier local (Electron). Null si non configuré. */
export function getSuperAdminPassword(): string | null {
  const fromEnv =
    process.env.SM_SUPER_ADMIN_PASSWORD ||
    process.env.SUPER_ADMIN_PASSWORD
  if (fromEnv) return fromEnv

  return readCredentialsFile()?.password ?? null
}

/** Génère et persiste un mot de passe aléatoire au premier lancement (Electron). */
export function ensureSuperAdminCredentials(): {
  email: string
  password: string
  isNew: boolean
} {
  const email = getSuperAdminEmail()
  const existing = getSuperAdminPassword()
  if (existing) {
    return { email, password: existing, isNew: false }
  }

  const password = crypto.randomBytes(16).toString('base64url')
  const creds: SuperAdminCredentialsFile = {
    email,
    password,
    createdAt: new Date().toISOString(),
  }

  fs.writeFileSync(getCredentialsPath(), JSON.stringify(creds, null, 2), { mode: 0o600 })

  return { email, password, isNew: true }
}
