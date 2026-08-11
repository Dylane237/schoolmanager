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

function cleanBrokenSymlinks(dir) {
  if (!fs.existsSync(dir)) return 0
  let count = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isSymbolicLink()) {
      try {
        fs.accessSync(fs.realpathSync(fullPath))
      } catch {
        fs.unlinkSync(fullPath)
        count++
      }
    } else if (entry.isDirectory()) {
      count += cleanBrokenSymlinks(fullPath)
    } else {
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

// Vérification que le build Next.js existe
if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  console.error('❌  .next/standalone/server.js introuvable. Lancez "npm run build" d\'abord.')
  process.exit(1)
}

console.log('📦 Préparation Electron...')
copyRecursive(staticSrc, staticDest)
copyRecursive(publicSrc, publicDest)
copyRecursive(path.join(root, 'migrations'), path.join(standalone, 'migrations'))
console.log('✅  static + public + migrations copiés dans .next/standalone')

const standaloneNextNodeModules = path.join(standalone, '.next', 'node_modules')

// Supprime les dossiers bcryptjs avec hash (symlinks cassés)
if (fs.existsSync(standaloneNextNodeModules)) {
  console.log('🧹 Suppression des entrées bcryptjs corrompues...')
  let count = 0
  for (const entry of fs.readdirSync(standaloneNextNodeModules)) {
    if (entry.startsWith('bcryptjs')) {
      const fullPath = path.join(standaloneNextNodeModules, entry)
      try {
        fs.rmSync(fullPath, { recursive: true, force: true })
        console.log(`🗑️  Supprimé : ${entry}`)
        count++
      } catch (e) {
        console.warn(`⚠️  Impossible de supprimer ${entry}:`, e.message)
      }
    }
  }
  console.log(`✅  ${count} entrée(s) bcryptjs supprimée(s)`)
}

// Supprime better-sqlite3 avec hash et le remplace par la version compilée correctement
if (fs.existsSync(standaloneNextNodeModules)) {
  console.log('🧹 Remplacement de better-sqlite3 hasché...')
  for (const entry of fs.readdirSync(standaloneNextNodeModules)) {
    if (entry.startsWith('better-sqlite3')) {
      const fullPath = path.join(standaloneNextNodeModules, entry)
      console.log(`🗑️  Suppression : ${entry}`)
      fs.rmSync(fullPath, { recursive: true, force: true })
    }
  }
  // Copie le better-sqlite3 correctement compilé depuis standalone/node_modules
  const srcSqlite = path.join(standalone, 'node_modules', 'better-sqlite3')
  const destSqlite = path.join(standaloneNextNodeModules, 'better-sqlite3')
  if (fs.existsSync(srcSqlite)) {
    console.log('📋 Copie better-sqlite3 compilé vers .next/node_modules...')
    copyRecursive(srcSqlite, destSqlite)
    console.log('✅ better-sqlite3 copié')
  }
}

// Patch les chunks turbopack qui référencent bcryptjs-xxxx
const chunksDir = path.join(standalone, '.next', 'server', 'chunks')
if (fs.existsSync(chunksDir)) {
  console.log('🔧 Patch des chunks turbopack...')
  let patched = 0
  for (const file of fs.readdirSync(chunksDir)) {
    const fullPath = path.join(chunksDir, file)
    try {
      let content = fs.readFileSync(fullPath, 'utf8')
      if (content.includes('bcryptjs-')) {
        content = content.replace(/bcryptjs-[a-f0-9]+/g, 'bcryptjs')
        fs.writeFileSync(fullPath, content)
        console.log(`✅ Patché : ${file}`)
        patched++
      }
    } catch {}
  }
  console.log(`✅  ${patched} chunk(s) patchés`)
}

// Patch les chunks qui référencent better-sqlite3-xxxx
if (fs.existsSync(chunksDir)) {
  console.log('🔧 Patch des chunks better-sqlite3...')
  let patched = 0
  for (const file of fs.readdirSync(chunksDir)) {
    const fullPath = path.join(chunksDir, file)
    try {
      let content = fs.readFileSync(fullPath, 'utf8')
      if (content.includes('better-sqlite3-')) {
        content = content.replace(/better-sqlite3-[a-f0-9]+/g, 'better-sqlite3')
        fs.writeFileSync(fullPath, content)
        console.log(`✅ Patché : ${file}`)
        patched++
      }
    } catch {}
  }
  console.log(`✅  ${patched} chunk(s) patchés`)
}

// Nettoie les symlinks cassés dans .next/standalone/.next/node_modules
if (fs.existsSync(standaloneNextNodeModules)) {
  console.log('🧹 Nettoyage des symlinks cassés dans .next/standalone/.next/node_modules...')
  const removed = cleanBrokenSymlinks(standaloneNextNodeModules)
  console.log(`✅  ${removed} entrée(s) cassée(s) supprimée(s)`)
}

// Nettoie aussi à la racine du standalone
const rootNodeModules = path.join(standalone, 'node_modules')
if (fs.existsSync(rootNodeModules)) {
  console.log('🧹 Nettoyage des symlinks cassés dans .next/standalone/node_modules...')
  const removed = cleanBrokenSymlinks(rootNodeModules)
  console.log(`✅  ${removed} entrée(s) cassée(s) supprimée(s)`)
}