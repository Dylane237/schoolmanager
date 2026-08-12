import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import { getCloudSyncStatus } from '@/lib/cloud-read'
import { fetchCloudDbMeta } from '@/lib/db-blob-sync'
import { getLocalSyncVersionPath } from '@/lib/paths'
import fs from 'fs'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  const status = await getCloudSyncStatus(user.ecole_slug)
  const dbMeta = await fetchCloudDbMeta(user.ecole_slug)
  const versionPath = getLocalSyncVersionPath(user.ecole_slug)
  const localVersion = fs.existsSync(versionPath)
    ? Number(fs.readFileSync(versionPath, 'utf8').trim()) || 0
    : 0

  return NextResponse.json({
    ...status,
    db_synced: dbMeta ? dbMeta.version === localVersion : false,
    db_cloud_version: dbMeta?.version ?? null,
    db_local_version: localVersion,
    db_updated_at: dbMeta?.updated_at ?? null,
    readOnly: false,
  })
}
