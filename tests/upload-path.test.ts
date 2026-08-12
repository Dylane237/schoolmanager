import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { resolveUploadPath, saveElevePhoto } from '@/lib/upload'

let tmpDir: string

describe('upload paths', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-upload-'))
    process.env.SM_USER_DATA = tmpDir
  })

  afterEach(() => {
    delete process.env.SM_USER_DATA
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('refuse les chemins hors du dossier uploads', () => {
    expect(resolveUploadPath('../../secret.txt')).toBeNull()
    expect(resolveUploadPath('../../../etc/passwd')).toBeNull()
  })

  it('résout un fichier enregistré', () => {
    const ecoleId = 'ecole-abc'
    const eleveId = 'eleve-123'
    const buffer = Buffer.from('fake-image')
    const saved = saveElevePhoto(ecoleId, eleveId, buffer, 'image/jpeg')
    expect('error' in saved).toBe(false)
    if ('error' in saved) return

    const resolved = resolveUploadPath(`${ecoleId}/${saved.filename}`)
    expect(resolved).toBeTruthy()
    expect(fs.existsSync(resolved!)).toBe(true)
  })
})
