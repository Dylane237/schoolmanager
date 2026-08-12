/**
 * Next.js standalone omet parfois des chunks serveur (file tracing incomplet sous Windows).
 * Copie .next/server/chunks → .next/standalone/.next/server/chunks
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const srcChunks = path.join(root, '.next', 'server', 'chunks')
const destChunks = path.join(root, '.next', 'standalone', '.next', 'server', 'chunks')

function syncServerChunks() {
  if (!fs.existsSync(srcChunks)) {
    console.warn('⚠️  .next/server/chunks introuvable — sync chunks ignorée')
    return { copied: 0, total: 0 }
  }

  if (!fs.existsSync(path.join(root, '.next', 'standalone', 'server.js'))) {
    console.warn('⚠️  .next/standalone/server.js introuvable — sync chunks ignorée')
    return { copied: 0, total: 0 }
  }

  fs.mkdirSync(destChunks, { recursive: true })
  const destBefore = new Set(fs.readdirSync(destChunks))
  let copied = 0

  for (const file of fs.readdirSync(srcChunks)) {
    fs.copyFileSync(path.join(srcChunks, file), path.join(destChunks, file))
    if (!destBefore.has(file)) copied++
  }

  return { copied, total: fs.readdirSync(srcChunks).length }
}

function verifyServerChunks() {
  if (!fs.existsSync(srcChunks) || !fs.existsSync(destChunks)) return

  const srcFiles = fs.readdirSync(srcChunks)
  const missing = srcFiles.filter((file) => !fs.existsSync(path.join(destChunks, file)))

  if (missing.length > 0) {
    console.error('❌ Chunks serveur manquants dans standalone :')
    for (const file of missing) console.error(`   - ${file}`)
    process.exit(1)
  }
}

if (require.main === module) {
  const { copied, total } = syncServerChunks()
  verifyServerChunks()
  console.log(`✅  ${copied} chunk(s) synchronisé(s) — ${total} chunk(s) au total dans standalone`)
}

module.exports = { syncServerChunks, verifyServerChunks, srcChunks, destChunks }
