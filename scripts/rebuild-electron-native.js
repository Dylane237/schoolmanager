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
  await rebuild({
    buildPath: standaloneDir,
    electronVersion,
    force: true,
    onlyModules: ['better-sqlite3'],
  })
  console.log('✅ better-sqlite3 prêt pour Electron (standalone)')
}

main().catch((err) => {
  console.error('❌ electron native rebuild failed:', err)
  process.exit(1)
})
