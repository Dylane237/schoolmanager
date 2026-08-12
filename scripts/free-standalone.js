/**
 * Libère .next/standalone avant un build (tue les serveurs Next/Electron locaux).
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const standalone = path.join(root, '.next', 'standalone')
const ports = [3000, 3001, 3099]

function killPid(pid) {
  if (!pid || pid === '0' || pid === String(process.pid)) return
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
    console.log(`🛑 Processus ${pid} arrêté`)
  } catch {}
}

function killWindowsPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port} "`, { encoding: 'utf8' })
    const pids = new Set()
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes('LISTENING')) continue
      const pid = line.trim().split(/\s+/).pop()
      if (pid) pids.add(pid)
    }
    for (const pid of pids) killPid(pid)
  } catch {}
}

function killByImageName(name) {
  try {
    execSync(`taskkill /IM ${name} /F`, { stdio: 'ignore' })
    console.log(`🛑 ${name} arrêté`)
  } catch {}
}

console.log('🧹 Libération des processus qui verrouillent le standalone…')

if (process.platform === 'win32') {
  for (const port of ports) killWindowsPort(port)
  killByImageName('SchoolManager.exe')
  killByImageName('electron.exe')
} else {
  for (const port of ports) {
    try {
      execSync(`lsof -ti:${port} | xargs -r kill -9`, { stdio: 'ignore', shell: true })
    } catch {}
  }
}

if (fs.existsSync(standalone)) {
  // Laisse Windows libérer les handles fichiers
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)
}

console.log('✅ Prêt pour le build')
