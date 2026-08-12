/**
 * Lance next dev + Electron avec SM_USER_DATA pointant vers Documents/SchoolManager.
 */
const path = require('path')
const os = require('os')
const { spawn } = require('child_process')

const smData = path.join(os.homedir(), 'Documents', 'SchoolManager')
const env = { ...process.env, SM_USER_DATA: smData }

const command =
  'npx concurrently --names next,electron --kill-others-on-fail ' +
  '"next dev" "wait-on http://localhost:3000 && electron ."'

const child = spawn(command, [], { env, stdio: 'inherit', shell: true })

child.on('exit', (code) => process.exit(code ?? 0))
