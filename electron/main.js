const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const http = require('http')
const { spawn } = require('child_process')

let mainWindow
let splashWindow
let nextServer

const PORT = 3000

// Toutes les données (BDD, photos, sauvegardes, exports) dans Mes Documents/SchoolManager
const SCHOOL_MANAGER_DATA = path.join(os.homedir(), 'Documents', 'SchoolManager')
if (!fs.existsSync(SCHOOL_MANAGER_DATA)) {
  fs.mkdirSync(SCHOOL_MANAGER_DATA, { recursive: true })
}
app.setPath('userData', SCHOOL_MANAGER_DATA)

function getServerDir() {
  if (app.isPackaged) {
    // Le standalone est extrait hors de l'asar dans app.asar.unpacked
    return path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone')
  }
  return path.join(__dirname, '..', '.next', 'standalone')
}

// ─── Splash screen ────────────────────────────────────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })

  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          width: 480px; height: 320px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          border-radius: 16px;
          color: white;
          user-select: none;
        }
        .logo {
          font-size: 56px;
          margin-bottom: 16px;
        }
        h1 {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }
        .tagline {
          font-size: 14px;
          opacity: 0.8;
          margin-bottom: 40px;
        }
        .bar-container {
          width: 280px;
          height: 4px;
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
          overflow: hidden;
        }
        .bar {
          height: 100%;
          width: 0%;
          background: white;
          border-radius: 2px;
          animation: load 6s ease-in-out forwards;
        }
        @keyframes load {
          0%   { width: 0%; }
          30%  { width: 40%; }
          60%  { width: 70%; }
          85%  { width: 88%; }
          100% { width: 95%; }
        }
        .status {
          margin-top: 14px;
          font-size: 12px;
          opacity: 0.7;
        }
      </style>
    </head>
    <body>
      <div class="logo">🎓</div>
      <h1>SchoolManager</h1>
      <p class="tagline">Gestion scolaire simplifiée</p>
      <div class="bar-container"><div class="bar"></div></div>
      <p class="status">Démarrage en cours…</p>
    </body>
    </html>
  `

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`)
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close()
    splashWindow = null
  }
}

// ─── Serveur Next.js ──────────────────────────────────────────────────────────
function waitForServer(maxAttempts = 120) {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const check = () => {
      attempts++
      const req = http.get(`http://127.0.0.1:${PORT}`, (res) => {
        res.resume()
        resolve(true)
      })
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error("Le serveur Next.js n'a pas démarré à temps"))
        } else {
          setTimeout(check, 500)
        }
      })
      req.setTimeout(2000, () => req.destroy())
    }
    check()
  })
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const userDataPath = app.getPath('userData')
    ensureDirectories(userDataPath)

    const secretPath = path.join(userDataPath, '.jwt-secret')
    const jwtSecret = fs.existsSync(secretPath)
      ? fs.readFileSync(secretPath, 'utf8').trim()
      : undefined

    const serverDir = getServerDir()
    const serverScript = path.join(serverDir, 'server.js')

    if (!fs.existsSync(serverScript)) {
      reject(new Error(`Serveur introuvable : ${serverScript}`))
      return
    }

    nextServer = spawn(process.execPath, [serverScript], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(PORT),
        HOSTNAME: '127.0.0.1',
        SM_USER_DATA: userDataPath,
        ELECTRON_RUN_AS_NODE: '1',
        LICENCE_SERVER_URL: 'https://schoolmanager-eosin.vercel.app',
        NEXT_PUBLIC_SUPABASE_URL: 'https://lwfylrnmpwtemzbogppt.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_Lvh8K6K8NMMwegPPYJBn0w_Ef-gtX8N',
        ...(jwtSecret ? { SM_JWT_SECRET: jwtSecret } : {}),
      },
      cwd: serverDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    nextServer.stdout?.on('data', (data) => {
      const msg = data.toString()
      if (msg.trim()) console.log('[next]', msg.trim())
    })
    nextServer.stderr?.on('data', (data) => {
      const msg = data.toString()
      if (msg.trim()) console.error('[next]', msg.trim())
    })
    nextServer.on('error', reject)
    nextServer.on('exit', (code) => {
      if (code !== 0 && code !== null) console.error('[next] exit code', code)
    })

    waitForServer().then(resolve).catch(reject)
  })
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function ensureDirectories(userDataPath) {
  const dirs = [
    userDataPath,
    path.join(userDataPath, 'uploads', 'eleves'),
    path.join(userDataPath, 'backups'),
    path.join(userDataPath, 'exports'),
  ]
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }
}

ipcMain.handle('get-data-path', () => SCHOOL_MANAGER_DATA)
ipcMain.handle('open-data-folder', () => shell.openPath(SCHOOL_MANAGER_DATA))

function runDailyBackup(userDataPath) {
  try {
    const dbPath = path.join(userDataPath, 'schoolmanager.db')
    if (!fs.existsSync(dbPath)) return

    const backupsDir = path.join(userDataPath, 'backups')
    const today = new Date().toISOString().slice(0, 10)
    const backupPath = path.join(backupsDir, `schoolmanager-${today}.db`)

    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(dbPath, backupPath)
      const files = fs.readdirSync(backupsDir)
        .filter(f => f.startsWith('schoolmanager-') && f.endsWith('.db'))
        .map(f => ({ path: path.join(backupsDir, f), mtime: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)

      for (const file of files.slice(7)) fs.unlinkSync(file.path)
    }
  } catch (err) {
    console.error('Backup error:', err)
  }
}

// ─── Fenêtre principale ───────────────────────────────────────────────────────
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'SchoolManager',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  })

  try {
    await mainWindow.loadURL(`http://127.0.0.1:${PORT}`)
  } catch (err) {
    console.error('Erreur chargement URL:', err)
  }

  // Ferme le splash et affiche la fenêtre principale
  closeSplash()
  mainWindow.maximize()
  mainWindow.show()

  mainWindow.on('closed', () => {
    mainWindow = null
    if (nextServer) {
      nextServer.kill()
      nextServer = null
    }
  })
}

// ─── Démarrage ────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const userDataPath = app.getPath('userData')
  ensureDirectories(userDataPath)
  runDailyBackup(userDataPath)
  process.env.SM_USER_DATA = userDataPath

  if (app.isPackaged) {
    createSplashWindow()

    try {
      await startNextServer()
    } catch (err) {
      console.error('Erreur démarrage serveur:', err)
      closeSplash()
      const { dialog } = require('electron')
      dialog.showErrorBox(
        'SchoolManager — Erreur de démarrage',
        `Le serveur n'a pas pu démarrer.\n\n${err.message}\n\nRelanchez l'application.`
      )
      app.quit()
      return
    }
  }

  await createMainWindow()
})

app.on('window-all-closed', () => {
  if (nextServer) nextServer.kill()
  app.quit()
})

app.on('before-quit', () => {
  if (nextServer) nextServer.kill()
})
