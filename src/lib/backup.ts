import fs from 'fs'
import path from 'path'
import { getBackupsDir, getDbPath } from './paths'

const MAX_BACKUPS = 7

export function runDailyBackup(): { success: boolean; path?: string; skipped?: boolean } {
  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) {
    return { success: false, skipped: true }
  }

  const backupsDir = getBackupsDir()
  const today = new Date().toISOString().slice(0, 10)
  const backupName = `schoolmanager-${today}.db`
  const backupPath = path.join(backupsDir, backupName)

  if (fs.existsSync(backupPath)) {
    return { success: true, path: backupPath, skipped: true }
  }

  fs.copyFileSync(dbPath, backupPath)
  rotateBackups(backupsDir)
  return { success: true, path: backupPath }
}

function rotateBackups(backupsDir: string) {
  const files = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('schoolmanager-') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      path: path.join(backupsDir, f),
      mtime: fs.statSync(path.join(backupsDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)

  for (const file of files.slice(MAX_BACKUPS)) {
    fs.unlinkSync(file.path)
  }
}

export function exportDatabase(destPath: string): boolean {
  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) return false
  fs.copyFileSync(dbPath, destPath)
  return true
}

export function listBackups(): { name: string; date: string; size: number }[] {
  const backupsDir = getBackupsDir()
  if (!fs.existsSync(backupsDir)) return []

  return fs.readdirSync(backupsDir)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stat = fs.statSync(path.join(backupsDir, f))
      return { name: f, date: f.replace('schoolmanager-', '').replace('.db', ''), size: stat.size }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}
