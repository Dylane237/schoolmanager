import 'server-only'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase-admin'
import { recordSyncEvent } from './sync-monitor'

export const DB_STORAGE_BUCKET = 'school-databases'

export interface CloudDbSnapshotMeta {
  ecole_slug: string
  storage_path: string
  version: number
  size_bytes: number | null
  checksum: string | null
  updated_at: string
}

function storagePathForSlug(ecoleSlug: string): string {
  return `${ecoleSlug}/schoolmanager.db`
}

export async function fetchCloudDbMeta(ecoleSlug: string): Promise<CloudDbSnapshotMeta | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = getSupabaseAdmin()!
  const { data, error } = await supabase
    .from('cloud_db_snapshots')
    .select('*')
    .eq('ecole_slug', ecoleSlug)
    .maybeSingle()

  if (error || !data) return null
  return data as CloudDbSnapshotMeta
}

export async function downloadSchoolDbBuffer(ecoleSlug: string): Promise<Buffer | null> {
  if (!isSupabaseConfigured()) return null

  const meta = await fetchCloudDbMeta(ecoleSlug)
  if (!meta) return null

  const supabase = getSupabaseAdmin()!
  const { data, error } = await supabase.storage
    .from(DB_STORAGE_BUCKET)
    .download(meta.storage_path)

  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

export async function downloadSchoolDb(ecoleSlug: string, targetPath: string): Promise<boolean> {
  const buffer = await downloadSchoolDbBuffer(ecoleSlug)
  if (!buffer) return false

  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(targetPath, buffer)
  return true
}

export async function uploadSchoolDbBuffer(
  ecoleSlug: string,
  buffer: Buffer,
): Promise<{ ok: boolean; version?: number; error?: string; skipped?: boolean }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase non configuré' }
  if (!buffer.length) return { ok: false, error: 'Buffer vide' }

  const supabase = getSupabaseAdmin()!
  const storagePath = storagePathForSlug(ecoleSlug)
  const version = Date.now()
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex')

  const { error: uploadError } = await supabase.storage
    .from(DB_STORAGE_BUCKET)
    .upload(storagePath, buffer, { upsert: true, contentType: 'application/octet-stream' })

  if (uploadError) {
    const msg = uploadError.message
    const bucketMissing = /bucket not found/i.test(msg)
    recordSyncEvent(ecoleSlug, 'push_fail', msg)
    return { ok: false, error: msg, skipped: bucketMissing }
  }

  const { error: metaError } = await supabase
    .from('cloud_db_snapshots')
    .upsert({
      ecole_slug: ecoleSlug,
      storage_path: storagePath,
      version,
      size_bytes: buffer.length,
      checksum,
      updated_at: new Date().toISOString(),
    })

  if (metaError) {
    recordSyncEvent(ecoleSlug, 'push_fail', metaError.message)
    return { ok: false, error: metaError.message }
  }

  recordSyncEvent(ecoleSlug, 'push_ok', undefined, version)
  return { ok: true, version }
}

export async function uploadSchoolDb(
  ecoleSlug: string,
  sourcePath: string,
): Promise<{ ok: boolean; version?: number; error?: string; skipped?: boolean }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase non configuré' }
  if (!fs.existsSync(sourcePath)) return { ok: false, error: 'Fichier introuvable' }

  const buffer = fs.readFileSync(sourcePath)
  return uploadSchoolDbBuffer(ecoleSlug, buffer)
}
