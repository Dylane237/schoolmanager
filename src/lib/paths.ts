import 'server-only'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { runtimeEnv, isVercelRuntime } from './runtime-env'

const APP_DIR = '.schoolmanager-data'
export const SCHOOL_MANAGER_FOLDER = 'SchoolManager'

/** Dossier global dans Mes Documents : ~/Documents/SchoolManager */
export function getDocumentsSchoolManagerPath(): string {
  return path.join(os.homedir(), 'Documents', SCHOOL_MANAGER_FOLDER)
}

export function getUserDataDir(): string {
  const userData = runtimeEnv('SM_USER_DATA')
  if (userData) {
    // Chemin Windows copié par erreur dans les env Vercel (Linux)
    if (isVercelRuntime() && (/^[A-Za-z]:[\\/]/.test(userData) || userData.includes('\\'))) {
      return path.join('/tmp', SCHOOL_MANAGER_FOLDER)
    }
    return userData
  }

  if (isVercelRuntime()) {
    return path.join('/tmp', SCHOOL_MANAGER_FOLDER)
  }

  if (process.versions.electron) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { app } = require('electron')
      return app.getPath('userData')
    } catch {
      // fallback ci-dessous
    }
  }

  return path.join(process.cwd(), APP_DIR)
}

export function ensureUserDataDir(): string {
  const dir = getUserDataDir()
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch {
    // FS read-only (ex. certaines lambdas) — on continue en mémoire / tmp
  }
  return dir
}

export function getDbPath(ecoleSlug?: string): string {
  if (isVercelRuntime() && ecoleSlug) {
    return path.join('/tmp', SCHOOL_MANAGER_FOLDER, ecoleSlug, 'schoolmanager.db')
  }
  return path.join(ensureUserDataDir(), 'schoolmanager.db')
}

/** Alias explicite pour la sync par école (web) ou desktop (sans slug). */
export function getDbPathForSlug(ecoleSlug?: string): string {
  return getDbPath(ecoleSlug)
}

export function getLocalSyncVersionPath(ecoleSlug: string): string {
  if (isVercelRuntime()) {
    return path.join('/tmp', SCHOOL_MANAGER_FOLDER, ecoleSlug, '.sync-version')
  }
  return path.join(ensureUserDataDir(), `.sync-version-${ecoleSlug}`)
}

export function getLocalSyncMetaPath(ecoleSlug: string): string {
  if (isVercelRuntime()) {
    return path.join('/tmp', SCHOOL_MANAGER_FOLDER, ecoleSlug, '.sync-meta.json')
  }
  return path.join(ensureUserDataDir(), `.sync-meta-${ecoleSlug}.json`)
}

export function getUploadsDir(subdir?: string): string {
  const base = path.join(ensureUserDataDir(), 'uploads')
  const dir = subdir ? path.join(base, subdir) : base
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function getBackupsDir(): string {
  const dir = path.join(ensureUserDataDir(), 'backups')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function getExportsDir(): string {
  const dir = path.join(ensureUserDataDir(), 'exports')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function getSecretPath(): string {
  return path.join(ensureUserDataDir(), '.jwt-secret')
}

export function getMachineFingerprint(): string {
  try {
    const parts = [
      os.hostname(),
      os.userInfo().username,
      os.platform(),
      os.arch(),
      'schoolmanager-v2',
    ]
    return parts.join('|')
  } catch {
    return `serverless-${process.env.VERCEL_REGION ?? 'default'}`
  }
}
