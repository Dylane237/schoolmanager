const path = require('path')
const fs = require('fs')
const { rebuild } = require('@electron/rebuild')

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone')
const electronVersion = require('electron/package.json').version

async function rebuildIn(buildPath, label) {
  const modulesPath = path.join(buildPath, 'node_modules', 'better-sqlite3')
  if (!fs.existsSync(modulesPath)) {
    console.log(`⏭️  Pas de better-sqlite3 dans ${label}, ignoré`)
    return
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
      console.log(`✅ ${label} — ${stats.size} bytes — ${stats.mtime}`)
    } else {
      console.error(`❌ Binaire introuvable dans ${label}`)
    }
  } catch (e) {
    console.warn(`⚠️  Rebuild ${label} ignoré:`, e.message)
  }
}

async function main() {
  console.log(`🔧 Rebuild better-sqlite3 pour Electron ${electronVersion}…`)
  console.log(`🔧 Node local ABI: ${process.versions.modules} — Target Electron ABI: 146`)

  // 1. standalone/node_modules
  await rebuildIn(standaloneDir, 'standalone/node_modules')

  // 2. standalone/.next/node_modules
  const standaloneNextDir = path.join(standaloneDir, '.next')
  await rebuildIn(standaloneNextDir, 'standalone/.next/node_modules')
}

main().catch((err) => {
  console.error('❌ electron native rebuild failed:', err)
  process.exit(1)
})