import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import { getSchoolDbContext } from '@/lib/school-api'
import { computeSyncDiff } from '@/lib/sync-diff'
import { computeMergePreview } from '@/lib/sync-merge-preview'
import type { MergeDecision } from '@/lib/sync-merge'

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

  const diff = await computeSyncDiff(db, ecoleId, ecoleSlug)
  const choices: Record<string, 'local' | 'cloud' | 'skip'> = {}
  for (const d of body.decisions ?? []) {
    choices[`${d.entity_type}:${d.entity_id}`] = d.choice
  }

  const preview = computeMergePreview(diff.items, choices, body.allow_destructive === true)

  return NextResponse.json({ preview, diff_summary: diff.summary })
}
