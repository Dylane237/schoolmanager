/**
 * Build Next.js en mode webpack (compatible Electron standalone).
 * Ne pas définir SM_USER_DATA ici : Next.js l'inlinerait dans le bundle serveur.
 */
const { spawnSync } = require('child_process')
const { syncServerChunks, verifyServerChunks } = require('./sync-standalone-chunks')

const result = spawnSync('next', ['build', '--webpack'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

const { copied, total } = syncServerChunks()
verifyServerChunks()
console.log(`✅  Standalone : ${copied} chunk(s) ajouté(s), ${total} chunk(s) serveur présents`)

process.exit(0)
