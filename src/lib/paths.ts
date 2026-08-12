import 'server-only'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { runtimeEnv } from './runtime-env'

const APP_DIR = '.schoolmanager-data'
export const SCHOOL_MANAGER_FOLDER = 'SchoolManager'

/** Dossier global dans Mes Documents : ~/Documents/SchoolManager */
export function getDocumentsSchoolManagerPath(): string {
  return path.join(os.homedir(), 'Documents', SCHOOL_MANAGER_FOLDER)
}

export function getUserDataDir(): string {
  const userData = runtimeEnv('SM_USER_DATA')
  if (userData) {
    return userData
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
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function getDbPath(): string {
  return path.join(ensureUserDataDir(), 'schoolmanager.db')
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
  const parts = [
    os.hostname(),
    os.userInfo().username,
    os.platform(),
    os.arch(),
    'schoolmanager-v2',
  ]
  return parts.join('|')
}
