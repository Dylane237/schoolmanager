const path = require('path')
const fs = require('fs')
const { rebuild } = require('@electron/rebuild')

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone')
const electronVersion = require('electron/package.json').version

async function rebuildIn(buildPath, label, required = false) {
  const modulesPath = path.join(buildPath, 'node_modules', 'better-sqlite3')
  if (!fs.existsSync(modulesPath)) {
    if (required) {
      console.error(`❌ better-sqlite3 introuvable dans ${label}`)
      process.exit(1)
    }
    console.log(`⏭️  Pas de better-sqlite3 dans ${label}, ignoré`)
    return false
  }
  console.log(`🔧 Rebuild better-sqlite3 dans ${label}…`)
  try {
    await rebuild({
      buildPath,
      electronVersion,
      force: true,
      onlyModules: ['better-sqlite3'],
    })
    const binary = path.join(modulesPath, 'build', 'Release', 'better_sqlite3.node')
    if (fs.existsSync(binary)) {
      const stats = fs.statSync(binary)
      console.log(`✅ ${label} — ${stats.size} bytes — ${stats.mtime.toISOString()}`)
      return true
    }
    console.error(`❌ Binaire introuvable dans ${label}`)
    process.exit(1)
  } catch (e) {
    console.error(`❌ Rebuild ${label} échoué:`, e.message)
    process.exit(1)
  }
}

async function main() {
  console.log(`🔧 Rebuild better-sqlite3 pour Electron ${electronVersion}…`)
  console.log(`🔧 Node local ABI: ${process.versions.modules}`)

  // 1. standalone/node_modules (résolution principale Next standalone)
  await rebuildIn(standaloneDir, 'standalone/node_modules', true)

  // 2. standalone/.next/node_modules (créé par prepare-electron.js)
  const standaloneNextDir = path.join(standaloneDir, '.next')
  await rebuildIn(standaloneNextDir, 'standalone/.next/node_modules', true)
}

main().catch((err) => {
  console.error('❌ electron native rebuild failed:', err)
  process.exit(1)
})
