import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import { getSchoolDbContext } from '@/lib/school-api'
import { prepareSchoolDb } from '@/lib/db-server'
import { detectSyncConflict, describeSyncSides } from '@/lib/sync-conflict'
import { fetchCloudDbMeta } from '@/lib/db-blob-sync'
import { readLocalSyncMeta } from '@/lib/sync-meta'
import { computeSyncDiff, cloudChangesFromDiff } from '@/lib/sync-diff'

/** Compare la base locale au blob cloud sans pousser ni écraser — prépare le merge manuel. */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const denied = requireModule(user, 'parametres', 'POST')
  if (denied) return denied

  const slug = user.ecole_slug
  await prepareSchoolDb(slug)

  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId || !ecoleSlug) {
    return NextResponse.json({ error: 'École introuvable' }, { status: 404 })
  }

  const conflict = await detectSyncConflict(ecoleSlug)
  const meta = readLocalSyncMeta(ecoleSlug)
  const cloudMeta = await fetchCloudDbMeta(ecoleSlug)
  const diff = await computeSyncDiff(db, ecoleId, ecoleSlug)
  const cloud_pending = cloudChangesFromDiff(diff.items)

  return NextResponse.json({
    compared_at: new Date().toISOString(),
    conflict: conflict.hasConflict,
    conflict_log: conflict.hasConflict
      ? describeSyncSides(
        conflict,
        cloudMeta?.updated_at ?? null,
        meta.lastEditAt,
        meta.lastEditSource,
      )
      : null,
    diff,
    journal: {
      desktop: diff.local_pending,
      web: cloud_pending,
    },
    cloudVersion: cloudMeta?.version ?? null,
    cloudUpdatedAt: cloudMeta?.updated_at ?? null,
  })
}
