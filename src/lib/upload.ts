import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getUploadsDir } from './paths'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

export function saveElevePhoto(
  ecoleId: string,
  eleveId: string,
  buffer: Buffer,
  mimeType: string
): { url: string; filename: string } | { error: string } {
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return { error: 'Format non autorisé. Utilisez JPEG, PNG ou WebP.' }
  }
  if (buffer.length > MAX_SIZE) {
    return { error: 'Fichier trop volumineux (max 5 Mo).' }
  }

  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  const dir = getUploadsDir(path.join('eleves', ecoleId))
  const filename = `${eleveId}-${crypto.randomBytes(4).toString('hex')}.${ext}`
  const filePath = path.join(dir, filename)

  fs.writeFileSync(filePath, buffer)

  return {
    url: `/api/uploads/eleves/${ecoleId}/${filename}`,
    filename,
  }
}

export function deleteElevePhoto(photoUrl: string): void {
  if (!photoUrl.startsWith('/api/uploads/eleves/')) return
  const relative = photoUrl.replace('/api/uploads/eleves/', '')
  const filePath = path.join(getUploadsDir('eleves'), relative)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

export function resolveUploadPath(relativePath: string): string | null {
  const full = path.join(getUploadsDir('eleves'), relativePath)
  const normalized = path.normalize(full)
  const uploadsRoot = path.normalize(getUploadsDir('eleves'))
  if (!normalized.startsWith(uploadsRoot)) return null
  if (!fs.existsSync(normalized)) return null
  return normalized
}
