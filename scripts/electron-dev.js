/**
 * Lance next dev + Electron avec SM_USER_DATA pointant vers Documents/SchoolManager.
 * Libère le port 3000 pour éviter qu'Electron charge un ancien serveur Next (500).
 */
const path = require('path')
const os = require('os')
const { spawn, execSync } = require('child_process')

const DEV_PORT = 3000
const smData = path.join(os.homedir(), 'Documents', 'SchoolManager')
const env = { ...process.env, SM_USER_DATA: smData }

function freePort(port) {
  if (process.platform === 'win32') {
    try {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
      const pids = new Set()
      for (const line of out.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed.includes('LISTENING')) continue
        const parts = trimmed.split(/\s+/)
        const pid = parts[parts.length - 1]
        if (pid && pid !== '0') pids.add(pid)
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
          console.log(`[electron:dev] Processus ${pid} arrêté (port ${port})`)
        } catch {
          // ignore
        }
      }
    } catch {
      // port déjà libre
    }
    return
  }

  try {
    execSync(`npx --yes kill-port ${port}`, { stdio: 'ignore' })
  } catch {
    // port déjà libre
  }
}

freePort(DEV_PORT)

const command =
  `npx concurrently --names next,electron --kill-others-on-fail ` +
  `"next dev -p ${DEV_PORT}" "wait-on http://127.0.0.1:${DEV_PORT} && electron ."`

const child = spawn(command, [], { env, stdio: 'inherit', shell: true })

child.on('exit', (code) => process.exit(code ?? 0))
