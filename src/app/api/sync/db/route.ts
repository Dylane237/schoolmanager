import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import {
  pullSchoolDbToLocal,
  pushSchoolDbFromLocal,
} from '@/lib/db-server'
import { getDb, resolveEcoleId } from '@/lib/db-server'
import { pushSchoolDataFromEcoleId } from '@/lib/sync-trigger'
import { fetchCloudDbMeta } from '@/lib/db-blob-sync'
import { getLocalSyncVersionPath } from '@/lib/paths'
import fs from 'fs'

/**
 * Sync bidirectionnelle base SQLite ↔ cloud.
 * Desktop : pull si cloud plus récent, puis push local.
 * Web : push uniquement (pull fait à chaque requête via prepareSchoolDb).
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const denied = requireModule(user, 'parametres', 'POST')
  if (denied) return denied

  const slug = user.ecole_slug
  let pulled = false
  let pullVersion: number | undefined

  if (!process.env.VERCEL) {
    const pullResult = await pullSchoolDbToLocal(slug)
    pulled = pullResult.pulled
    pullVersion = pullResult.version
  }

  const pushResult = await pushSchoolDbFromLocal(slug)
  if (!pushResult.ok) {
    return NextResponse.json({ error: pushResult.error || 'Sync échouée' }, { status: 502 })
  }

  const db = getDb()
  const ecoleId = resolveEcoleId(db, slug, user.ecole_id)
  if (ecoleId) pushSchoolDataFromEcoleId(ecoleId)

  return NextResponse.json({
    success: true,
    pulled,
    pullVersion,
    pushVersion: pushResult.version,
    synced_at: new Date().toISOString(),
  })
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const cloudMeta = await fetchCloudDbMeta(user.ecole_slug)
  const versionPath = getLocalSyncVersionPath(user.ecole_slug)
  const localVersion = fs.existsSync(versionPath)
    ? Number(fs.readFileSync(versionPath, 'utf8').trim()) || 0
    : 0

  return NextResponse.json({
    cloud_version: cloudMeta?.version ?? null,
    local_version: localVersion,
    cloud_updated_at: cloudMeta?.updated_at ?? null,
    in_sync: cloudMeta ? cloudMeta.version === localVersion : localVersion === 0,
  })
}
