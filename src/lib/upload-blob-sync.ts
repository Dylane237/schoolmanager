import 'server-only'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { getUploadsDir } from './paths'
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase-admin'
import { recordSyncEvent } from './sync-monitor'

export const UPLOAD_STORAGE_BUCKET = 'school-uploads'

function storagePath(ecoleSlug: string, relativePath: string): string {
  return `${ecoleSlug}/${relativePath.replace(/\\/g, '/')}`
}

function listLocalUploadFiles(ecoleId: string): { relativePath: string; absolutePath: string }[] {
  const root = getUploadsDir('eleves')
  const schoolDir = path.join(root, ecoleId)
  if (!fs.existsSync(schoolDir)) return []

  const files: { relativePath: string; absolutePath: string }[] = []
  for (const name of fs.readdirSync(schoolDir)) {
    const absolutePath = path.join(schoolDir, name)
    if (!fs.statSync(absolutePath).isFile()) continue
    files.push({
      relativePath: `eleves/${ecoleId}/${name}`,
      absolutePath,
    })
  }
  return files
}

export async function pushSchoolUploads(
  ecoleSlug: string,
  ecoleId: string,
): Promise<{ ok: boolean; uploaded: number; errors: string[] }> {
  if (!isSupabaseConfigured()) return { ok: false, uploaded: 0, errors: ['Supabase non configuré'] }

  const supabase = getSupabaseAdmin()!
  const files = listLocalUploadFiles(ecoleId)
  const errors: string[] = []
  let uploaded = 0

  for (const file of files) {
    const buffer = fs.readFileSync(file.absolutePath)
    const remotePath = storagePath(ecoleSlug, file.relativePath)
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex')

    const { error } = await supabase.storage
      .from(UPLOAD_STORAGE_BUCKET)
      .upload(remotePath, buffer, { upsert: true, contentType: 'application/octet-stream' })

    if (error) {
      if (/bucket not found/i.test(error.message)) {
        recordSyncEvent(ecoleSlug, 'upload_push_fail', 'Bucket school-uploads absent — créez-le dans Supabase Storage')
        return { ok: false, uploaded: 0, errors: [error.message] }
      }
      errors.push(`${file.relativePath}: ${error.message}`)
      continue
    }

    await supabase.from('cloud_upload_files').upsert({
      ecole_slug: ecoleSlug,
      relative_path: file.relativePath,
      size_bytes: buffer.length,
      checksum,
      updated_at: new Date().toISOString(),
    })

    uploaded += 1
  }

  if (errors.length > 0) {
    recordSyncEvent(ecoleSlug, 'upload_push_fail', errors.join('; '))
    return { ok: false, uploaded, errors }
  }

  recordSyncEvent(ecoleSlug, 'upload_push_ok', `${uploaded} fichier(s)`)
  return { ok: true, uploaded, errors: [] }
}

export async function pullSchoolUploads(
  ecoleSlug: string,
  ecoleId: string,
): Promise<{ ok: boolean; downloaded: number; errors: string[] }> {
  if (!isSupabaseConfigured()) return { ok: false, downloaded: 0, errors: ['Supabase non configuré'] }

  const supabase = getSupabaseAdmin()!
  const { data, error } = await supabase
    .from('cloud_upload_files')
    .select('relative_path')
    .eq('ecole_slug', ecoleSlug)
    .like('relative_path', `eleves/${ecoleId}/%`)

  if (error) return { ok: false, downloaded: 0, errors: [error.message] }
  if (!data?.length) return { ok: true, downloaded: 0, errors: [] }

  const errors: string[] = []
  let downloaded = 0

  for (const row of data) {
    const relativePath = row.relative_path as string
    const remotePath = storagePath(ecoleSlug, relativePath)
    const localPath = path.join(getUploadsDir(), relativePath)

    const { data: blob, error: dlError } = await supabase.storage
      .from(UPLOAD_STORAGE_BUCKET)
      .download(remotePath)

    if (dlError || !blob) {
      errors.push(`${relativePath}: ${dlError?.message ?? 'téléchargement échoué'}`)
      continue
    }

    fs.mkdirSync(path.dirname(localPath), { recursive: true })
    fs.writeFileSync(localPath, Buffer.from(await blob.arrayBuffer()))
    downloaded += 1
  }

  if (errors.length > 0) {
    recordSyncEvent(ecoleSlug, 'upload_pull_fail', errors.join('; '))
    return { ok: false, downloaded, errors }
  }

  recordSyncEvent(ecoleSlug, 'upload_pull_ok', `${downloaded} fichier(s)`)
  return { ok: true, downloaded, errors: [] }
}
