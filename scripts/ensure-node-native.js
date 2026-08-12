/**
 * Vérifie que better-sqlite3 est compilé pour le Node.js courant (next dev / vitest).
 * Si le binaire date d'un rebuild Electron (ABI différent), relance npm rebuild.
 */
const { execSync } = require('child_process')

try {
  require('better-sqlite3')
} catch (err) {
  if (err?.code !== 'ERR_DLOPEN_FAILED') throw err

  console.log(
    `⚠️  better-sqlite3 incompatible avec Node ${process.versions.node} (ABI ${process.versions.modules}) — rebuild…`,
  )
  execSync('npm rebuild better-sqlite3', { stdio: 'inherit', cwd: require('path').join(__dirname, '..') })
  require('better-sqlite3')
  console.log('✅ better-sqlite3 prêt pour le dev Node')
}
