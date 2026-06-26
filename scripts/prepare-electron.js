/**
 * Prépare le build Electron : copie static + public dans .next/standalone
 * et nettoie les symlinks cassés qui font échouer 7zip/electron-builder
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const standalone = path.join(root, '.next', 'standalone')
const staticSrc = path.join(root, '.next', 'static')
const staticDest = path.join(standalone, '.next', 'static')
const publicSrc = path.join(root, 'public')
const publicDest = path.join(standalone, 'public')



// Supprime les dossiers/fichiers bcryptjs avec hash dans .next/standalone/.next/node_modules
const standaloneNextNodeModules = path.join(standalone, '.next', 'node_modules')
if (fs.existsSync(standaloneNextNodeModules)) {
  console.log('🧹 Suppression des entrées bcryptjs corrompues...')
  for (const entry of fs.readdirSync(standaloneNextNodeModules)) {
    if (entry.startsWith('bcryptjs')) {
      const fullPath = path.join(standaloneNextNodeModules, entry)
      try {
        fs.rmSync(fullPath, { recursive: true, force: true })
        console.log(`✅  Supprimé : ${entry}`)
      } catch (e) {
        console.warn(`⚠️  Impossible de supprimer ${entry}:`, e.message)
      }
    }
  }
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) copyRecursive(from, to)
    else fs.copyFileSync(from, to)
  }
}

/**
 * Supprime les symlinks cassés et les entrées inaccessibles
 * dans un dossier (récursivement)
 */
function cleanBrokenSymlinks(dir) {
  if (!fs.existsSync(dir)) return
  let count = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isSymbolicLink()) {
      // Vérifie si la cible du symlink existe
      try {
        fs.accessSync(fs.realpathSync(fullPath))
      } catch {
        fs.unlinkSync(fullPath)
        count++
      }
    } else if (entry.isDirectory()) {
      count += cleanBrokenSymlinks(fullPath)
    } else {
      // Vérifie que le fichier est accessible
      try {
        fs.accessSync(fullPath)
      } catch {
        try { fs.unlinkSync(fullPath) } catch {}
        count++
      }
    }
  }
  return count
}

if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  console.error('❌  .next/standalone/server.js introuvable. Lancez "npm run build" d\'abord.')
  process.exit(1)
}

console.log('📦 Préparation Electron...')
copyRecursive(staticSrc, staticDest)
copyRecursive(publicSrc, publicDest)
console.log('✅  static + public copiés dans .next/standalone')

// Nettoie les symlinks cassés dans le standalone (cause d'échec de 7zip)
const nodeModulesInStandalone = path.join(standalone, '.next', 'node_modules')
if (fs.existsSync(nodeModulesInStandalone)) {
  console.log('🧹 Nettoyage des symlinks cassés dans .next/standalone/.next/node_modules...')
  const removed = cleanBrokenSymlinks(nodeModulesInStandalone)
  console.log(`✅  ${removed} entrée(s) cassée(s) supprimée(s)`)
}

// Nettoie aussi à la racine du standalone
const rootNodeModules = path.join(standalone, 'node_modules')
if (fs.existsSync(rootNodeModules)) {
  console.log('🧹 Nettoyage des symlinks cassés dans .next/standalone/node_modules...')
  const removed = cleanBrokenSymlinks(rootNodeModules)
  console.log(`✅  ${removed} entrée(s) cassée(s) supprimée(s)`)
}