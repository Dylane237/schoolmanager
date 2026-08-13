import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import { getSchoolDbContext } from '@/lib/school-api'
import { refreshSchoolDbForCompare } from '@/lib/school-db'
import { computeSyncDiff } from '@/lib/sync-diff'
import { incomingChangeCount, incomingChangesFromDiff } from '@/lib/sync-notifications'

/** Liste les modifications de l'autre plateforme (pour la cloche de notifications). */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user?.ecole_slug) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const denied = requireModule(user, 'parametres', 'GET')
    if (denied) return denied

    const slug = user.ecole_slug
    const refresh = request.nextUrl.searchParams.get('refresh') !== '0'
    if (refresh) {
      await refreshSchoolDbForCompare(slug)
    }

    const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
    if (!ecoleId || !ecoleSlug) {
      return NextResponse.json({ error: 'École introuvable' }, { status: 404 })
    }

    const diff = await computeSyncDiff(db, ecoleId, ecoleSlug)
    const items = incomingChangesFromDiff(diff.items)

    return NextResponse.json({
      count: incomingChangeCount(diff),
      items,
      has_differences: diff.has_differences,
      checked_at: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[sync/notifications]', err)
    return NextResponse.json({ error: message, count: 0, items: [] }, { status: 500 })
  }
}
