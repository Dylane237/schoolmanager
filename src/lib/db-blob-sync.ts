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

export async function downloadSchoolDb(ecoleSlug: string, targetPath: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const meta = await fetchCloudDbMeta(ecoleSlug)
  if (!meta) return false

  const supabase = getSupabaseAdmin()!
  const { data, error } = await supabase.storage
    .from(DB_STORAGE_BUCKET)
    .download(meta.storage_path)

  if (error || !data) return false

  const buffer = Buffer.from(await data.arrayBuffer())
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(targetPath, buffer)
  return true
}

export async function uploadSchoolDb(
  ecoleSlug: string,
  sourcePath: string,
): Promise<{ ok: boolean; version?: number; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase non configuré' }
  if (!fs.existsSync(sourcePath)) return { ok: false, error: 'Fichier introuvable' }

  const supabase = getSupabaseAdmin()!
  const buffer = fs.readFileSync(sourcePath)
  const storagePath = storagePathForSlug(ecoleSlug)
  const version = Date.now()
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex')

  const { error: uploadError } = await supabase.storage
    .from(DB_STORAGE_BUCKET)
    .upload(storagePath, buffer, { upsert: true, contentType: 'application/octet-stream' })

  if (uploadError) {
    recordSyncEvent(ecoleSlug, 'push_fail', uploadError.message)
    return { ok: false, error: uploadError.message }
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
