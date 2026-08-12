import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import { getSchoolDbContext } from '@/lib/school-api'
import { applyMergeDecisions, type MergeDecision } from '@/lib/sync-merge'
import { computeSyncDiff } from '@/lib/sync-diff'
import { withSchoolSyncLock } from '@/lib/sync-lock'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const denied = requireModule(user, 'parametres', 'POST')
  if (denied) return denied

  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId || !ecoleSlug) {
    return NextResponse.json({ error: 'École introuvable' }, { status: 404 })
  }

  let body: { decisions: MergeDecision[]; allow_destructive?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  if (!Array.isArray(body.decisions) || body.decisions.length === 0) {
    return NextResponse.json({ error: 'Aucune décision fournie' }, { status: 400 })
  }

  const result = await withSchoolSyncLock(ecoleSlug, async () => {
    const merge = await applyMergeDecisions(
      db,
      ecoleId,
      ecoleSlug,
      body.decisions,
      undefined,
      { allowDestructive: body.allow_destructive === true },
    )
    const diff = await computeSyncDiff(db, ecoleId, ecoleSlug)
    return { ...merge, diff }
  })

  return NextResponse.json({
    success: result.errors.length === 0 && result.applied > 0,
    applied: result.applied,
    skipped: result.skipped,
    blocked: result.blocked,
    errors: result.errors,
    diff: result.diff,
  })
}
