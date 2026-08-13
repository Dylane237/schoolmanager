import fs from 'fs'
import path from 'path'
import { getBackupsDir, getDbPath } from './paths'
import { getDb } from './db'

function closeDb() {
  try {
    const db = getDb()
    db.close()
  } catch {}
}

function reopenDb() {
  // SQLite se rouvre automatiquement via getDb()
}

// Rétention alignée sur le cycle scolaire : on garde une sauvegarde
// quotidienne pendant 1 an (365 jours), pour pouvoir remonter jusqu'au
// début de l'année scolaire en cours si besoin. Au-delà, les fichiers sont
// supprimés automatiquement lors de la rotation.
const RETENTION_DAYS = 365

// Rétention plus courte pour les sauvegardes de sécurité créées avant une
// restauration (pre-restore-*.db) : ce sont des filets de rattrapage pour
// une restauration ratée, pas des archives à conserver un an.
const SAFETY_BACKUP_RETENTION_DAYS = 30

/**
 * Force le rapatriement du contenu de schoolmanager.db-wal dans le fichier
 * principal schoolmanager.db. Indispensable avant toute copie du .db seul,
 * sinon les écritures récentes (encore dans le WAL) sont ignorées.
 * TRUNCATE vide aussi le fichier .db-wal après coup (le remet à ~0 Ko).
 */
function checkpointWal(): void {
  const db = getDb()
  db.pragma('wal_checkpoint(TRUNCATE)')
}

export function runDailyBackup(): { success: boolean; path?: string; skipped?: boolean; error?: string } {
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

  try {
    checkpointWal()
  } catch (err) {
    return { success: false, error: `Échec du checkpoint WAL : ${(err as Error).message}` }
  }

  fs.copyFileSync(dbPath, backupPath)
  rotateBackups(backupsDir)
  return { success: true, path: backupPath }
}

/**
 * Supprime les sauvegardes plus vieilles que leur durée de rétention.
 * Basé sur l'âge du fichier (et non plus un nombre fixe de fichiers), pour
 * garantir qu'on garde bien une sauvegarde couvrant tout le cycle scolaire.
 */
function rotateBackups(backupsDir: string) {
  purgeOldFiles(backupsDir, f => f.startsWith('schoolmanager-') && f.endsWith('.db'), RETENTION_DAYS)
  purgeOldFiles(backupsDir, f => f.startsWith('pre-restore-') && f.endsWith('.db'), SAFETY_BACKUP_RETENTION_DAYS)
}

function purgeOldFiles(dir: string, matches: (filename: string) => boolean, retentionDays: number) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000

  const files = fs.readdirSync(dir).filter(matches)
  for (const f of files) {
    const filePath = path.join(dir, f)
    const mtime = fs.statSync(filePath).mtimeMs
    if (mtime < cutoff) {
      fs.unlinkSync(filePath)
    }
  }
}

export function exportDatabase(destPath: string): boolean {
  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) return false

  try {
    checkpointWal()
  } catch {
    return false
  }

  fs.copyFileSync(dbPath, destPath)
  return true
}

export function isValidSqliteFile(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r')
    const header = Buffer.alloc(16)
    fs.readSync(fd, header, 0, 16, 0)
    fs.closeSync(fd)
    return header.toString('utf8', 0, 15) === 'SQLite format 3'
  } catch {
    return false
  }
}

export function restoreDatabase(sourcePath: string): { success: boolean; error?: string; safetyBackupPath?: string } {
  if (!fs.existsSync(sourcePath)) {
    return { success: false, error: 'Fichier introuvable.' }
  }
  if (!isValidSqliteFile(sourcePath)) {
    return { success: false, error: "Le fichier sélectionné n'est pas une base de données SQLite valide." }
  }

  const dbPath = getDbPath()
  const backupsDir = getBackupsDir()
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true })
  }

  // Sauvegarde de sécurité de la base actuelle avant écrasement, pour pouvoir
  // annuler une restauration ratée. On checkpoint d'abord pour que cette
  // sauvegarde de sécurité soit elle-même complète.
  let safetyBackupPath: string | undefined
  if (fs.existsSync(dbPath)) {
    try {
      checkpointWal()
    } catch {
      // On continue même si le checkpoint échoue : mieux vaut une sauvegarde
      // de sécurité potentiellement incomplète que pas de filet du tout.
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    safetyBackupPath = path.join(backupsDir, `pre-restore-${stamp}.db`)
    fs.copyFileSync(dbPath, safetyBackupPath)
  }

  // Étape critique : fermer la connexion active AVANT d'écraser le fichier.
  // Sans ça, un .db-wal/.db-shm résiduel de l'ancienne connexion peut être
  // "rejoué" par-dessus la base fraîchement restaurée au prochain accès,
  // corrompant les données qu'on vient de restaurer.
  try {
    closeDb()
  } catch (err) {
    return { success: false, error: `Impossible de fermer la connexion à la base : ${(err as Error).message}` }
  }

  try {
    // Nettoyage des fichiers WAL/SHM résiduels de l'ANCIENNE base : s'ils
    // restent à côté du .db fraîchement restauré, SQLite peut les prendre
    // pour le WAL de la nouvelle base au redémarrage.
    const walPath = `${dbPath}-wal`
    const shmPath = `${dbPath}-shm`
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)

    fs.copyFileSync(sourcePath, dbPath)
  } catch (err) {
    // On tente de rouvrir la connexion même en cas d'échec, pour ne pas
    // laisser l'appli dans un état sans base du tout.
    try { reopenDb() } catch { /* déjà en échec, on ne masque pas l'erreur d'origine */ }
    return { success: false, error: `Échec de la copie : ${(err as Error).message}` }
  }

  try {
    reopenDb()
  } catch (err) {
    return { success: false, error: `Restauration copiée mais échec de réouverture de la connexion : ${(err as Error).message}`, safetyBackupPath }
  }

  return { success: true, safetyBackupPath }
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