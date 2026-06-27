/**
 * Recompile better-sqlite3 pour la version Node embarquée dans Electron.
 * À exécuter après next build + prepare-electron, avant electron-builder.
 */
const path = require('path')
const { rebuild } = require('@electron/rebuild')

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone')
const electronVersion = require('electron/package.json').version

async function main() {
  console.log(`🔧 Rebuild better-sqlite3 pour Electron ${electronVersion}…`)

  // Rebuild dans le standalone (node_modules à la racine)
  await rebuild({
    buildPath: standaloneDir,
    electronVersion,
    force: true,
    onlyModules: ['better-sqlite3'],
  })

  // Rebuild aussi dans .next/node_modules à l'intérieur du standalone
  const standaloneNextDir = path.join(standaloneDir, '.next')
  const fs = require('fs')
  const nestedModules = path.join(standaloneNextDir, 'node_modules')
  
  if (fs.existsSync(nestedModules)) {
    console.log(`🔧 Rebuild better-sqlite3 dans .next/node_modules…`)
    try {
      await rebuild({
        buildPath: standaloneNextDir,
        electronVersion,
        force: true,
        onlyModules: ['better-sqlite3'],
      })
    } catch (e) {
      console.warn('⚠️  Rebuild .next/node_modules ignoré:', e.message)
    }
  }

  console.log('✅ better-sqlite3 prêt pour Electron (standalone)')
}

main().catch((err) => {
  console.error('❌ electron native rebuild failed:', err)
  process.exit(1)
})