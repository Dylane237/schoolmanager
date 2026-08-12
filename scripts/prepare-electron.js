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
const rootNodeModules = path.join(standalone, 'node_modules')
const standaloneNextNodeModules = path.join(standalone, '.next', 'node_modules')
const chunksDir = path.join(standalone, '.next', 'server', 'chunks')
const { syncServerChunks, verifyServerChunks } = require('./sync-standalone-chunks')

/** Modules natifs requis au runtime (serverExternalPackages + dépendances) */
const NATIVE_MODULES = ['better-sqlite3', 'bcryptjs', 'bindings', 'file-uri-to-path']

/** Packages Next standalone (file tracing incomplet sous Windows/Electron) */
const NEXT_RUNTIME_PACKAGES = [
  'next',
  '@next/env',
  '@swc/helpers',
  'postcss',
  'styled-jsx',
  'caniuse-lite',
  'baseline-browser-mapping',
  'nanoid',
  'picocolors',
  'source-map-js',
  'tslib',
]

function syncPackageFromRoot(name) {
  const parts = name.split('/')
  const dest = path.join(rootNodeModules, ...parts)
  const src = path.join(root, 'node_modules', ...parts)
  const srcPkg = path.join(src, 'package.json')

  if (!fs.existsSync(srcPkg)) {
    console.warn(`⚠️  ${name} absent du projet, ignoré`)
    return false
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.rmSync(dest, { recursive: true, force: true })
  copyRecursive(src, dest)
  return true
}

function ensureNextRuntimeDependencies() {
  console.log('📋 Synchronisation des dépendances runtime Next.js…')
  let copied = 0
  for (const name of NEXT_RUNTIME_PACKAGES) {
    if (syncPackageFromRoot(name)) copied++
  }
  console.log(`✅  ${copied}/${NEXT_RUNTIME_PACKAGES.length} package(s) synchronisé(s)`)
}

function smokeTestStandaloneServer() {
  const { spawnSync } = require('child_process')
  console.log('🧪 Test de chargement Next.js standalone…')
  const script = [
    `process.chdir(${JSON.stringify(standalone)})`,
    "require('next')",
    "require('next/dist/server/lib/start-server')",
    "require('@swc/helpers/_/_interop_require_default')",
    "console.log('OK')",
  ].join('; ')
  const result = spawnSync(process.execPath, ['-e', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SM_USER_DATA: path.join(root, '.schoolmanager-data'),
    },
  })
  if (result.status !== 0) {
    console.error('❌ Smoke test standalone échoué:')
    console.error(result.stderr || result.stdout)
    process.exit(1)
  }
  console.log('✅  Next.js standalone chargeable')
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

function removeHashedNativeEntries(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir)) {
    if (/^(better-sqlite3|bcryptjs)-[a-f0-9]+/.test(entry)) {
      fs.rmSync(path.join(dir, entry), { recursive: true, force: true })
      console.log(`🗑️  Supprimé : ${entry}`)
    }
  }
}

/** Next 16 webpack ne crée plus .next/node_modules — on le recrée pour Electron */
function syncNativeModulesToNextNodeModules() {
  fs.mkdirSync(standaloneNextNodeModules, { recursive: true })
  removeHashedNativeEntries(standaloneNextNodeModules)

  console.log('📋 Synchronisation des modules natifs vers .next/node_modules…')
  let copied = 0
  for (const mod of NATIVE_MODULES) {
    const src = path.join(rootNodeModules, mod)
    const dest = path.join(standaloneNextNodeModules, mod)
    if (!fs.existsSync(src)) {
      console.warn(`⚠️  ${mod} absent de standalone/node_modules`)
      continue
    }
    fs.rmSync(dest, { recursive: true, force: true })
    copyRecursive(src, dest)
    copied++
  }
  console.log(`✅  ${copied}/${NATIVE_MODULES.length} module(s) natif(s) copiés`)
}

function runSyncServerChunks() {
  const { copied, total } = syncServerChunks()
  verifyServerChunks()
  console.log(`✅  ${copied} chunk(s) serveur synchronisé(s) — ${total} au total`)
}

function patchHashedChunkReferences() {
  if (!fs.existsSync(chunksDir)) return

  console.log('🔧 Patch des chunks bcryptjs / better-sqlite3…')
  let patched = 0
  for (const file of fs.readdirSync(chunksDir)) {
    const fullPath = path.join(chunksDir, file)
    try {
      let content = fs.readFileSync(fullPath, 'utf8')
      const original = content
      content = content.replace(/bcryptjs-[a-f0-9]+/g, 'bcryptjs')
      content = content.replace(/better-sqlite3-[a-f0-9]+/g, 'better-sqlite3')
      if (content !== original) {
        fs.writeFileSync(fullPath, content)
        patched++
      }
    } catch {}
  }
  console.log(`✅  ${patched} chunk(s) patchés`)
}

function verifyStandalone() {
  const required = [
    ['server.js', path.join(standalone, 'server.js')],
    ['messages/en/auth.json', path.join(standalone, 'messages', 'en', 'auth.json')],
    ['migrations/001_audit_log.sql', path.join(standalone, 'migrations', '001_audit_log.sql')],
    ['node_modules/next/package.json', path.join(rootNodeModules, 'next', 'package.json')],
    ['node_modules/next/dist/server/lib/start-server.js', path.join(rootNodeModules, 'next', 'dist', 'server', 'lib', 'start-server.js')],
    ['node_modules/@swc/helpers/package.json', path.join(rootNodeModules, '@swc', 'helpers', 'package.json')],
    ['node_modules/@next/env/package.json', path.join(rootNodeModules, '@next', 'env', 'package.json')],
    ['node_modules/bcryptjs', path.join(rootNodeModules, 'bcryptjs')],
    ['.next/node_modules/better-sqlite3', path.join(standaloneNextNodeModules, 'better-sqlite3')],
    ['.next/node_modules/bcryptjs', path.join(standaloneNextNodeModules, 'bcryptjs')],
  ]

  const missing = required.filter(([, p]) => !fs.existsSync(p)).map(([label]) => label)
  if (missing.length > 0) {
    console.error('❌ Standalone incomplet — éléments manquants :')
    for (const label of missing) console.error(`   - ${label}`)
    process.exit(1)
  }
  console.log('✅  Vérification standalone OK')
}

// ─── Main ───────────────────────────────────────────────────────────────────

if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  console.error('❌  .next/standalone/server.js introuvable. Lancez "npm run build" d\'abord.')
  process.exit(1)
}

console.log('📦 Préparation Electron...')
copyRecursive(staticSrc, staticDest)
copyRecursive(publicSrc, publicDest)
copyRecursive(path.join(root, 'migrations'), path.join(standalone, 'migrations'))
copyRecursive(path.join(root, 'messages'), path.join(standalone, 'messages'))
console.log('✅  static + public + migrations + messages copiés dans .next/standalone')

// Données de dev/build qui ne doivent pas être empaquetées
const strayDataDir = path.join(standalone, '.schoolmanager-data')
if (fs.existsSync(strayDataDir)) {
  fs.rmSync(strayDataDir, { recursive: true, force: true })
  console.log('🗑️  .schoolmanager-data retiré du standalone (données de build)')
}

const turbopackRuntime = path.join(chunksDir, '[turbopack]_runtime.js')
if (fs.existsSync(turbopackRuntime)) {
  console.error(
    '❌ Build Turbopack détecté dans standalone — incompatible avec Electron.\n' +
      '   Relancez : npm run electron:build  (utilise next build --webpack)',
  )
  process.exit(1)
}

ensureNextRuntimeDependencies()

runSyncServerChunks()
syncNativeModulesToNextNodeModules()
patchHashedChunkReferences()

if (fs.existsSync(standaloneNextNodeModules)) {
  console.log('🧹 Nettoyage des symlinks cassés dans .next/node_modules…')
  const removed = cleanBrokenSymlinks(standaloneNextNodeModules)
  console.log(`✅  ${removed} entrée(s) cassée(s) supprimée(s)`)
}

if (fs.existsSync(rootNodeModules)) {
  console.log('🧹 Nettoyage des symlinks cassés dans standalone/node_modules…')
  const removed = cleanBrokenSymlinks(rootNodeModules)
  console.log(`✅  ${removed} entrée(s) cassée(s) supprimée(s)`)
}

verifyStandalone()
smokeTestStandaloneServer()
